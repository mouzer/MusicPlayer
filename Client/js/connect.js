var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.connect = (function()
{
	var webSock = null;

	return {
		createWebSocket: function(callback, onMessageCallback) 
		{
			webSock = new WebSocket('ws://localhost:3001/');

			webSock.onopen = callback;
			webSock.onmessage = onMessageCallback;
		},

		sendQuery: function(query)
		{
			webSock.send(JSON.stringify(query));
		},

		chooseAlbum: function(artist, album)
		{
			getAlbumTracks(artist, album, showAlbumTracks);
		},
	};
}());