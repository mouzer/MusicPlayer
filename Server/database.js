var dbEngine = require('tingodb')();

var db;
var collection;

function saveTag(tag, callback)
{
    var tmpArtist = tag.albumArtist || tag.artist;

    console.log('Saving: ' + tmpArtist + ' - ' + tag.song + ' - ' + tag.album + ' - ' + tag.track);

    var doc = { artist: tag.artist, albumArtist: tag.albumArtist, song: tag.song, album: tag.album, track: parseInt(tag.track), path: tag.path };

    collection.insert(doc, {w:1}, 
        function(error, result) 
        {
            if (error)
                console.log(error);

            callback();
        });
}

function setupDatabaseDone()
{
    console.log('Finished setting up database.');
	//clearDatabase(clearDatabaseDone);
}

function clearDatabaseDone()
{
    console.log('Finished clearing database.');
}

function setupDatabase(callback)
{
    db = new dbEngine.Db('', {});
    collection = db.collection('Settings'); 

    if (callback)
        callback();
}

function clearDatabase(callback)
{
    collection.remove();

    if (callback)
        callback();
}

function saveTags(tagList, callback)
{
	var tagsSaved = 0;

	var listSize = tagList.length;
	for (var cnt = 0; cnt < listSize; cnt++)
	{
		saveTag(tagList[cnt], 
			function()
			{
				if (++tagsSaved == listSize)
					callback(listSize);
			});
	}
}

function getTagCount(callback)
{
    collection.count(
        function(error, count)
        {
            callback(count);
        });
}

function getAllTags(callback)
{
	var didCallback = false;

    collection.find().toArray(
        function(error, docs) 
        {
    		if (!didCallback)
    		{
                callback(docs);
    			didCallback = true;
            }
        });
}

function getTags(offset, tagsToGet, callback)
{
    collection.find().skip(offset).limit(tagsToGet).toArray(
        function(error, docs) 
        {
            callback(docs);
        });
}

function getFileFromID(id, callback)
{
    collection.find({ _id: id }).toArray(
        function(error, docs)
        {
            callback(docs[0].path);
        });
}

function isAlbumInArray(albumList, album)
{
    for (var cnt = 0; cnt < albumList.length; cnt++)
    {
        var tmpAlbum = albumList[cnt];

        if (album.albumArtist != tmpAlbum.albumArtist)
            return false;

        if (album.album == tmpAlbum.album)
            return true;
    }

    return false;        
}

function getAlbumCount(callback)
{
    var albums = [];

    collection.find( { }, { albumArtist: 1, album: 1 } ).toArray(
        function(error, docs)
        {
            for (var cnt = 0; cnt < docs.length; cnt++)
            {
                if (isAlbumInArray(albums, docs[cnt]))
                    continue;

                albums.push(docs[cnt]);
            }

            callback(albums.length);
        });
}

function getAllAlbums(callback)
{
    var albums = [];

    collection.find( { }, { albumArtist: 1, album: 1 } ).toArray(
        function(error, docs)
        {
            for (var cnt = 0; cnt < docs.length; cnt++)
            {
                if (isAlbumInArray(albums, docs[cnt]))
                    continue;

                albums.push(doc[cnt]);
            }
        });
}

function getAlbums(offset, albumsToGet, callback)
{
    var albums = [];

    collection.find( { }, { albumArtist: 1, album: 1 } ).toArray(
        function(error, docs)
        {
            for (var cnt = 0; cnt < docs.length; cnt++)
            {
                if (isAlbumInArray(albums, docs[cnt]))
                    continue;

                albums.push(docs[cnt]);
            }

            callback(albums.slice(offset, offset + albumsToGet))
        });
}

function getAlbumTracks(albumArtist, album, callback)
{
    collection.find({ albumArtist: albumArtist, album: album }).sort({ track: 1 }).toArray(
        function(error, docs)
        {
            callback(docs);
        });
}

setupDatabase(setupDatabaseDone);

module.exports.getTags = getTags;
module.exports.saveTags = saveTags;
module.exports.getAlbums = getAlbums;
module.exports.getAllTags = getAllTags;
module.exports.getTagCount = getTagCount;
module.exports.getAlbumCount = getAlbumCount;
module.exports.getFileFromID = getFileFromID;
module.exports.getAlbumTracks = getAlbumTracks;
