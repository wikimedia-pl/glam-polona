const axios = require("axios");
const fs = require("fs");
const util = require("util");
const semlog = require("semlog");

const readFile = util.promisify(fs.readFile);
const { log } = semlog;

/**
 * Checks if title is longer than 240 bytes required by MediaWiki
 * 225 = 240 - 15 for id and extension
 * @param {string} title
 */
function isTitleTooLong(title) {
  return new util.TextEncoder("utf-8").encode(title).length > 225;
}

function shortenTitle(title) {
  const newTitle = `${title.substring(0, title.lastIndexOf(" "))}...`;
  return isTitleTooLong(newTitle) ? shortenTitle(newTitle) : newTitle;
}

/**
 * Removes chars forbidden in MediaWiki file title
 * @param {string} title
 */
function convertToMediaWikiTitle(title) {
  const escapedTitle = title
    .replace(/[\[\]{}\|#<>%\+\?]/gi, "") // eslint-disable-line no-useless-escape
    .replace(/( : |: | = )/g, " - ")
    .replace(/:/g, "-");
  return isTitleTooLong(escapedTitle)
    ? shortenTitle(escapedTitle)
    : escapedTitle;
}

/**
 * Takes data from Polona endpoint and retuens object with data
 * @param {string} identifier Polona identifier
 */
async function fetchData(identifier) {
  return new Promise(resolve => {
    log(`Fetching ${identifier}...`);
    axios
      .get(`https://polona.pl/api/entities/${identifier}/?format=json`)
      .then(response => {
        const { data } = response;

        const {
          id,
          academica_id,
          slug,
          title,
          creator_name,
          date_descriptive,
          country,
          imprint,
          publisher,
          physical_description,
          categories,
          keywords,
          notes,
          rights,
          digital_copy_by,
          main_scan,
          links
        } = data;

        const { academica_url, catalogue_url } = links;

        const name = `${convertToMediaWikiTitle(title)} (${academica_id}).jpg`;
        const file_url = main_scan.resources.pop().url;

        resolve({
          file: `${file_url}.jpg`,
          name,
          file_url,
          academica_id,
          title,
          creator_name,
          date_descriptive,
          country,
          imprint,
          publisher,
          physical_description,
          categories: categories.join(),
          keywords: keywords && keywords.join(),
          notes,
          rights: rights.join(),
          digital_copy_by: digital_copy_by.join(),
          polona_url: `https://polona.pl/item/${slug},${id}/0/`,
          academica_url,
          catalogue_url
        });
      })
      .catch(() => {
        log("error");
        resolve({});
      });
  });
}

/**
 * Reads input file
 * @param {string} fileName
 */
async function readInputFile(fileName) {
  const data = await readFile(fileName, "utf8");
  return data.split(/\n/).filter(value => value);
}

function wikify(data) {
  return `=={{int:filedesc}}==
{{Book
  |Author = ${data.creator_name || ""}
  |Translator = 
  |Editor = 
  |Illustrator = 
  |Title = ${data.title || ""}
  |Subtitle = 
  |Series title = 
  |Volume = 
  |Edition = 
  |Publisher = ${data.publisher || ""}${
    data.publisher && data.imprint ? "<br />" : ""
  }${data.imprint ? "Imprint: " : ""}${data.imprint}
  |Printer = 
  |Date = ${data.date_descriptive || ""}
  |Description = {{pl|${data.physical_description}}}${
    data.notes ? "\n\n" : ""
  }${
    data.notes && data.notes.length
      ? data.notes.map(note => `{{pl|${note}}}`).join("\n\n")
      : ""
  }
  |Source = https://polona.pl/item/${data.academica_id}/0
  |Institution = {{Institution:National Library, Warsaw}} ${
    data.digital_copy_by
  }
}}

=={{int:license-header}}==
{{PD-old-70}}
{{National Library in Warsaw partnership}}
{{Uncategorized-Polona|year={{subst:CURRENTYEAR}}|month={{subst:CURRENTMONTHNAME}}|day={{subst:CURRENTDAY}}}}`;
}

module.exports = { fetchData, log, readInputFile, wikify };
