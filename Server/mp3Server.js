var fs = require('fs');
var url = require('url');
var http = require('http');
var path = require('path');

var database = require('./database');
var TagParser = require('./TagParser');

function processRequest(request, response)
{
	var header = {};
	var returnCode = 200;

	var tagSize = 0;
	var fileSize = 0;

	function getFileFromIDDone(filePath)
	{
		fs.stat(filePath,
			function(error, stats)
			{
				if (!stats)
					return;

				var tagParser = new TagParser(false);

				tagParser.getTag(filePath, 
					function(error, tag)
					{
						tagSize = tagParser.getTagSize() + 10;
						fileSize = stats.size - tagSize;

						fs.open(filePath, 'r', openFileDone);
					});
			});
	}

	function setHeader(start, end, chunkSize)
	{
		header['Content-Type'] = 'audio/mpeg'; 
		header['Content-Range'] = 'bytes ' + start + '-' + end + '/' + fileSize;
		header['Accept-Ranges'] = 'bytes';
		header['Transfer-Encoding'] = 'chunked';
		header['Content-Transfer-Encoding'] = 'binary';
		header['Connection'] = 'close';
	}

	function openFileDone(error, fd)
	{
		var chunkSize = 0;
		var startRead = 0;

		if (!request.headers || !request.headers.range)
		{
			chunkSize = fileSize;
			returnCode = 200;
		}
		else
		{
			var range = request.headers.range; 
			var parts = range.replace('bytes=', '').split('-'); 

			var tmpStart = parts[0]; 
			var tmpEnd = parts[1]; 

			var start = parseInt(tmpStart, 10); 
			var end = tmpEnd ? parseInt(tmpEnd, 10) : fileSize - 1;

			var chunkSize = (end - start) + 1;

			if (chunkSize == 0)
				chunkSize = fileSize;

			setHeader(start, end, chunkSize);
			returnCode = 206;

			startRead = start + tagSize;
		}

		buffer = new Buffer(chunkSize);
		fs.read(fd, buffer, 0, chunkSize, startRead, readFileDone);
	}

	function readFileDone(error, bytesRead, buffer)
	{
		response.writeHead(returnCode, header);
		response.write(buffer, 'binary');

		response.end();

		buffer = null;
	}

	var url_parts = url.parse(request.url, true);
	var requestPath = url_parts.pathname;

	var extension = path.extname(requestPath);

	if (extension != '.mp3')
	{
		response.write('<html>File not found.<br /> File: ' + requestPath);
		return;
	}

	var id = request.url.substr(1, request.url.length - 5);
	console.log('Request for ID: ' + id);

	database.getFileFromID(id, getFileFromIDDone);
}

http.createServer(processRequest).listen(3002, '0.0.0.0');