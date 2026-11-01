import data from "../Export-Journal/Journal.json" with { "type": "json" };
import * as z from "zod";
import fs from "node:fs/promises";
import { DateTime } from 'luxon';

const Location = z.object({
    placeName: z.string().optional(),
    address: z.string().optional(),
    longitude: z.number(),
    latitude: z.number(),
})

const ImageData = z.object({
    identifier: z.string(),
    md5: z.string(),
})

const Entry = z.object({
    text: z.string(),
    creationDate: z.coerce.date(),
    timeZone: z.string(),
    tags: z.string().array().optional(),
    location: Location.optional(),
    photos: z.array(ImageData).optional(),
})

const Journal = z.object({
    entries: z.array(Entry),
})

const journalParsed = Journal.parse(data);

function convertUtcToTimezone(utcDate: Date, timeZone: string): DateTime {
    const newDate = DateTime.fromJSDate(utcDate).setZone(timeZone);
    if (!newDate.isValid) {
        console.warn(`${newDate} from ${utcDate} and ${timeZone} is not valid`)
    }
    return newDate;
}

for (let i = 0; i < journalParsed.entries.length; i++) {
    const e = journalParsed.entries[i]!;
    const tzDate = convertUtcToTimezone(e.creationDate, e.timeZone);

    let content = "---\n";
    content += "tags:\n";
    e.tags?.forEach(tag => content += `  - ${tag}\n`)
    if (e.location) {
        content += "location:\n";
        content += `  - ${e.location.latitude}\n`
        content += `  - ${e.location.longitude}\n`
        if (e.location.placeName) {
            content += `place_name: "${e.location.placeName.replace("\n", " ")}"\n`
        }
        if (e.location.address) {
            content += `address: "${e.location.address.replace("\n", " ")}"\n`
        }
    }

    const regex = /!\[\]\(dayone-moment:\/\/([A-Za-z0-9-]+)\)/g;
    const imageIds = [...e.text.matchAll(regex)]
        .map(match => match[0] as String)
        .map(match => match.slice(20, match.length - 1))

    let imageLocations = [];
    for (let id of imageIds) {
        const matchingPhotos = e.photos?.filter(photo => photo.identifier == id);
        if (matchingPhotos?.length == 0 || !matchingPhotos) {
            console.error(e.photos);
            console.dir(`${e.photos} | ${id} | ${imageIds}`), {depth: null};
        } else {
            imageLocations.push(matchingPhotos[0]!.md5);
        }
    }

    content += "images:\n";
    imageLocations.forEach(id => content += `  - ${id}.jpg\n`);

    content += "---\n";
    content += e.text.replace(regex, "");

    const folder = tzDate.toFormat("'out/'yyyy/MM/dd");
    await fs.mkdir(folder, { recursive: true });
    
    for (let imageMd5 of imageLocations) {
        const imageLocation = `./Export-Journal/photos/${imageMd5}.jpg`
        const targetLocation = `${folder}/${imageMd5}.jpg`
        await fs.copyFile(imageLocation, targetLocation);
    }

    const fileName = folder + tzDate.toFormat("/HHmm.'md'")
    await fs.writeFile(fileName, content, 'utf8')
}
