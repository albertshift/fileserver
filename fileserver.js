var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs")
    port = process.argv[2] || 8888;

var contentTypesByExtension = {
    '.html': "text/html",
    '.css':  "text/css",
    '.js':   "text/javascript",
    '.doc':  "application/msword",
    '.txt':  "text/plain",
    '.pdf':  "application/pdf"
};

var mimeFilename = path.join(process.cwd(), 'mime');
if (path.existsSync(mimeFilename)) {
  var mime = fs.readFileSync(mimeFilename, 'utf8').split('\n');
  mime.forEach(function(line) {
     var part = line.split(/\s/g);
     if (part[0] != "" && part[1] != "*") {
       contentTypesByExtension["." + part[1]] = part[0];
     }
  });
}

function fileNotFound(response, filename) {
  response.writeHead(404, {"Content-Type": "text/plain"});
  response.write("404 Not Found " + filename + "\n");
  response.end();
}

function internalError(response, err, filename) {
  console.log(err);
  response.writeHead(500, {"Content-Type": "text/plain"});
  response.write("Error on access " + filename + ": " + err + "\n");
  response.end();
}

//console.log(contentTypesByExtension);

http.createServer(function(request, response) {

var uri = url.parse(request.url).pathname;
var decodedUri = decodeURI(uri);
var filename = path.join(process.cwd(), decodedUri);

try {

  console.log("Access to " + filename + " from " + JSON.stringify(request.headers));

  path.exists(filename, function(exists) {
    if(!exists) {
       fileNotFound(response, filename);
       return;
    }

    var stat = fs.statSync(filename);

    if (stat.isDirectory()) {
      indexFilename = filename + '/index.html';
      if (path.existsSync(indexFilename)) {
         filename = indexFilename;
      }
      else {
        fs.readdir(filename, function (err, files) {
          if (err) {
            internalError(response, err, filename);
            return;
          }

          response.writeHead(200, {"Content-Type": "text/html"});

          var html = "<html><body>";
          files.forEach(function(file) {
             fileuri = file;
             if (uri != "/") fileuri = decodedUri + "/" + file
             html += "<a href=\"" + fileuri + "\">" + file + "</a></br>";
          });
          html += "</html></body>";

          response.write(html);
          response.end();
          return;
        });
        return;
      }
    }

    var headers = {};
    var contentType = contentTypesByExtension[path.extname(filename)];
    if (!contentType) contentType = 'application/octet-stream';
    headers["Content-Type"] = contentType;
    headers['Content-Length'] = stat.size;
    response.writeHead(200, headers);
    var fileStream = fs.createReadStream(filename, {
                     'flags': 'r',
                     'mode': 0666,
                     'bufferSize': 65536});
    fileStream.pipe(response);
  });

}
catch(err) {
  internalError(response, err, filename);
  return;
}
}).listen(parseInt(port, 10));

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");


