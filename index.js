const { argv } = require("yargs");
const MWBot = require("mwbot");

const { fetchData, log, readInputFile, wikify } = require("./helpers");

const credentials = {
  username: argv.user || "Polona Upload",
  password: argv.password
};

const wiki = new MWBot({
  apiUrl: "https://commons.wikimedia.org/w/api.php"
});

async function processInput(fileName = "input.txt") {
  log(`[i] Reading file '${fileName}'`);

  await readInputFile(fileName).then(async values => {
    const { csrftoken } = await wiki.getEditToken();

    // eslint-disable-next-line
    for (const id of values) {
      // eslint-disable-next-line
      const data = await fetchData(id);
      const { academica_id, name, file_url } = data;
      const wikicode = wikify(data);

      if (argv.test) {
        log(data);
        log(wikicode);
      }

      if (!argv.test) {
        log(`Uploading ${academica_id}...`);
        log(`[i] File:${name}`);

        // eslint-disable-next-line
        await wiki
          .request({
            action: "upload",
            filename: name,
            url: file_url,
            text: wikicode,
            token: csrftoken
          })
          .catch(err => log(`[E] ${err.message}`));
      }
    }
  });
}

async function login() {
  await wiki.loginGetEditToken(credentials);
}

async function main() {
  if (!argv.input) {
    log(`[W] No input file specified, assuming 'input.txt'.
               Add --input=<filename> to change it`);
  }

  if (!argv.test) {
    if (!argv.password) {
      throw new Error(`Missing password!
                 Add --password=<password>`);
    }
    await login();
  }
  await processInput(argv.input);

  log("[i] Done");
}

main().catch(err => log(`[E] ${err.message}`));
