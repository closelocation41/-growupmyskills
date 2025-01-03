const express = require("express");
const fs = require("fs");
const path = require("path");
const showdown = require("showdown");
const serverless = require("serverless-http");
const app = express();
const routesConfig = require("./routes.json");

// Initialize Showdown converter
const converter = new showdown.Converter();
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Function to read file content using streams
function streamMarkdownFile(filepath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filepath, { encoding: "utf8" });
    let content = "";

    readStream.on("data", (chunk) => {
      content += chunk;
    });

    readStream.on("end", () => {
      resolve(content);
    });

    readStream.on("error", (err) => {
      reject(err);
    });
  });
}
app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Dynamically add routes based on routes.json
routesConfig.forEach((config) => {
  config.routes.forEach((route) => {
    console.log(`Setting up route: ${route.endpoint} for file: ${config.filepath}`);
    app.get(route.endpoint, async (req, res) => {
      try {
        console.log(`Received request for: ${route.endpoint}`);
        const fileContent = await streamMarkdownFile(path.resolve(config.filepath));
        const htmlContent = converter.makeHtml(fileContent);
        res.render("template", { title: route.title, content: htmlContent });
      } catch (err) {
        console.error(`Error processing route ${route.endpoint}:`, err);
        res.status(500).send("Error reading file");
      }
    });
  });
});


// Export the app for Serverless
module.exports.handler = serverless(app);
