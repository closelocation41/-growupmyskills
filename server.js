const express = require("express");
const fs = require("fs");
const path = require("path");
const showdown = require("showdown");
const serverless = require("serverless-http");
const routesConfig = require("./routes.json")[0]; // Access the first object in the array

const app = express();

// Initialize Showdown converter
const converter = new showdown.Converter();
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));

// Set up EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Function to group routes by categories (based on `groups`)
function groupRoutesByGroup(groupsConfig, filesConfig) {
  const groupedRoutes = {};
  Object.entries(groupsConfig).forEach(([group, endpoints]) => {
    groupedRoutes[group] = endpoints.map((endpoint) => {
      // Find the matching file and route for the endpoint
      for (const [filepath, fileData] of Object.entries(filesConfig)) {
        const route = fileData.routes.find((r) => r.endpoint === endpoint);
        if (route) {
          return {
            endpoint: route.endpoint,
            title: route.details.title,
          };
        }
      }
    }).filter(Boolean); // Remove undefined entries
  });
  return groupedRoutes;
}

// Grouped routes data
const groupedRoutes = groupRoutesByGroup(routesConfig.groups, routesConfig.files);

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

// Root Route
app.get("/", (req, res) => {
  res.render("home", { groupedRoutes });
});

// Dynamically add routes based on `files` in `routes.json`
Object.entries(routesConfig.files).forEach(([filepath, fileData]) => {
  fileData.routes.forEach((route) => {
    console.log(`Setting up route: ${route.endpoint} for file: ${filepath}`);
    app.get(route.endpoint, async (req, res) => {
      try {
        const fileContent = await streamMarkdownFile(path.resolve(filepath));
        const htmlContent = converter.makeHtml(fileContent);
        res.render("template", {
          details: route.details,
          content: htmlContent,
          groupedRoutes,
        });
      } catch (err) {
        console.error(`Error processing route ${route.endpoint}:`, err);
        res.status(500).send("Error reading file");
      }
    });
  });
});

// Export the app for Serverless
module.exports.handler = serverless(app);
