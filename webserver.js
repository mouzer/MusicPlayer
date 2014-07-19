var fs = require('fs');
var url = require('url');
var http = require('http');
var path = require('path');
var database = require('./database');

extensions = 
{
    ".html" : "text/html",
    ".css" : "text/css",
    ".js" : "application/javascript",
    ".png" : "image/png",
    ".gif" : "image/gif",
    ".jpg" : "image/jpeg"
};

function getFileNotFoundResponse(requestPath)
{
	return '<html>File not found.<br />' + requestPath;
}

function getAJAXFailedResponse(requestPath)
{
	return '<html>AJAX request failed.<br />' + requestPath;
}

function getNoTagsResponse(requestPath)
{
	return '<html>No mp3 files.<br />' + requestPath;
}

function processAJAXRequest(request, callback)
{
	var url_parts = url.parse(request.url, true);
	var requestPath = url_parts.pathname;

	switch (requestPath)
	{
	case '/getAllTags':
		{
			database.getAllTags(
				function(docs)
				{
					if (!docs)
					{
						callback(getNoTagsResponse(requestPath), 'text/html');
						return;
					}

					var html;
				
					var listSize = docs.length;
					for (var cnt = 0; cnt < listSize; cnt++)
					{
						var tag = docs[cnt];

						html += tag.artist + ' - ' + tag.track + ' - ' + tag.album;
						html += '<br />';
					}

					callback(html, 'text/html');
				});
		}
		break;
	}
}

function processFileRequest(request, callback)
{
	var url_parts = url.parse(request.url, true);
	var requestPath = url_parts.pathname;

	var extension = path.extname(requestPath);
	var mimeType = extensions[extension];

	if (!mimeType)
	{
		callback(getFileNotFoundResponse(requestPath), 'text/html');
		return;
	}

	var fullPath = '.' + requestPath;

	if (!fs.existsSync(fullPath))
	{
		callback(getFileNotFoundResponse(requestPath), "text/html");
		return;
	}

	fs.readFile(fullPath, 
		function (err, data) 
		{
			callback(data, mimeType);
		});
}

function getHTML(request, callback)
{
	var url_parts = url.parse(request.url, true);
	var requestPath = url_parts.pathname;

	if (requestPath == '/')
	{
		request.url = '/index.html';
		requestPath = '/index.html';
	}

	var extension = path.extname(requestPath);

	if (!extension)
	{
		processAJAXRequest(request, callback);
		return;
	}

	processFileRequest(request, callback);
}

function processRequest(request, response)
{
    	console.log(request.url);

    	getHTML(request,
    		function (data, mimeType)
    		{
    			response.writeHead(200, {'Content-Type': 'text/html', 'Content-Length' : data.length });
    			response.write(data + '');  
    			response.end();		
    		});

		//fs.readFile('./index.html', function (err, html) {
}

http.createServer(processRequest).listen(3000, '127.0.0.1');