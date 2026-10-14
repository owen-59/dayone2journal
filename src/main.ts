import data from "../Journal.json";
import * as z from "zod";
import { format } from "date-fns";
import fs from "node:fs/promises";

const Location = z.object({
    placeName: z.string().optional(),
    address: z.string().optional(),
    longitude: z.number(),
    latitude: z.number(),
})

const Entry = z.object({
    text: z.string(),
    creationDate: z.coerce.date(),
    timeZone: z.string(),
    tags: z.string().array().optional(),
    location: Location.optional(),
})

const Journal = z.object({
    entries: z.array(Entry),
})

const journalParsed = Journal.parse(data);

console.log(journalParsed)

for (let i = 0; i < journalParsed.entries.length; i++) {
    const e = journalParsed.entries[i]!;

    let content = "---\n";
    content += "tags:\n";
    e.tags?.forEach(tag => content += `  - ${tag}\n`)
    if (e.location) {
        content += "location:\n";
        content += `  - ${e.location.latitude}\n`
        content += `  - ${e.location.longitude}\n`
        if (e.location.placeName) {
            content += `place_name: ${e.location.placeName}\n`
        }
    }
    content += "---\n";
    content += e.text;

    const folder = format(e.creationDate, "'out/'yyyy/MM/dd");
    await fs.mkdir(folder, { recursive: true });

    const fileName = folder + format(e.creationDate, "/HHmm.'md'")
    await fs.writeFile(fileName, content, 'utf8')

}
