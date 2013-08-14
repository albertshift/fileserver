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

//console.log(contentTypesByExtension);

http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname;
  var decodedUri = decodeURI(uri);
  var filename = path.join(process.cwd(), decodedUri);

  console.log("Access to " + filename);

  path.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found " + filename + "\n");
      response.end();
      return;
    }

    if (fs.statSync(filename).isDirectory()) {
      indexFilename = filename + '/index.html';
      if (path.existsSync(indexFilename)) {
         filename = indexFilename;
      } 
      else {
        fs.readdir(filename, function (err, files) {
          if (err) {
            console.log(err);
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write(err + "\n");
            response.end();
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
      }
    }

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        console.log(err);
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      var headers = {};
      var contentType = contentTypesByExtension[path.extname(filename)];
      if (!contentType) contentType = 'application/octet-stream'; 
      headers["Content-Type"] = contentType;
      response.writeHead(200, headers);
      response.write(file, "binary");
      response.end();
    });
  });
}).listen(parseInt(port, 10));

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");


