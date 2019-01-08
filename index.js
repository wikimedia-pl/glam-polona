const axios = require("axios");
const fs = require("fs");
const Json2csvParser = require("json2csv").Parser;

const output = [];

function saveFile(text) {
  const time = new Date().getTime();
  fs.appendFile(`output-${time}.csv`, text, error => {
    console.log(error ? "Error :(" : "Done!");
  });
}

async function processIDs(array) {
  for (const id of array) {
    const line = await fetchData(id);
    output.push(line);
  }

  const json2csvParser = new Json2csvParser();
  const csv = json2csvParser.parse(output);

  saveFile(csv);
}

async function fetchData(identifier) {
  return new Promise(resolve => {
    console.log(`Fetching ${identifier}...`);
    axios
      .get(`https://polona.pl/api/entities/${identifier}/?format=json`)
      .then(response => {
        const { data } = response;

        const {
          id,
          academica_id,
          slug,
          title,
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

        const file_url = main_scan.resources.pop().url;
        const polona_url = `https://polona.pl/item/${slug},${id}/0/`;

        resolve({
          file_url,
          academica_id,
          title,
          date_descriptive,
          country,
          imprint,
          publisher,
          physical_description,
          categories: categories.join(),
          keywords: keywords.join(),
          notes,
          rights: rights.join(),
          digital_copy_by: digital_copy_by.join(),
          polona_url,
          academica_url,
          catalogue_url
        });
      })
      .catch(() => {
        console.log(`Err :(`);
        resolve();
      });
  });
}

processIDs([335388, 337568, 337531, 337535]);
