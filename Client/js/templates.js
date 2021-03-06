var MusicPlayer = window.MusicPlayer || {};

var menus = MusicPlayer.menus;

function TrackEntry(templateElement)
{
	var _id;
	var _song;
	var _time;
	var _track;

	var _album;
	var _artist;

	var _clone = $(templateElement).clone();

	function getElement()
	{
		var songName = _clone.find(".song");
		songName.html(_song);

		_clone.data("artist", _artist);
		_clone.data("album", _album);

		_clone.find(".track").html(_track);
		_clone.find(".time").html(_time);

		var playLink = _clone.find(".playButtonSmall");
		var menuLink = _clone.find(".menuLink");

		(function(trackID)
		{
			var menuOpen = false;

			playLink.click(
				function()
				{
					musicPlayer.playSong(_id);
				});

			songName.click(
				function()
				{
					musicPlayer.playSong(_id);
				});

			menuLink.click(
				function()
				{
					menus.showTrackMenu(_clone, _id);
				});

			_clone.mouseover(
				function(event)
				{
					menuLink.show();
				});

			_clone.mouseout(
				function(event)
				{
					if (menuOpen)
						return;

					menuLink.hide();
				});

			_clone.bind('menuOpened', 
				function()
				{
					menuOpen = true;

					menuLink.show();
					menuLink.toggleClass('menuOpen');
					
					_clone.toggleClass('selected');
				});

			_clone.bind('menuClosed', 
				function()
				{
					menuOpen = false;

					menuLink.hide();
					menuLink.toggleClass('menuOpen');
					
					_clone.toggleClass('selected');
				});
		})(_id);

		return _clone;
	}

	return {
		getElement: function()
		{ 
			return getElement();
		},

		setInfo: function(track, artist, album)
		{
			_id = track._id;
			_song = track.song;
			_time = track.time;
			_track = track.track;

			_artist = artist;
			_album = album;
		},
	};
}

function AlbumEntry(templateElement)
{
	var _year;
	var _album;
	var _albumArtist;

	var _clone = $(templateElement).clone();

	function getElement()
	{
		var albumImageSmall = _clone.find(".albumImageSmall");
		var albumArtwork = _clone.find(".albumArtwork");

		(function()
		{
			albumImageSmall.bind('load', 
				function() 
				{
					_clone.css('opacity', 1)
				});

			_clone.click(
				function(event)
				{
					musicPlayer.chooseAlbum(event);
				});

			_clone.mouseenter(
				function(event)
				{
					musicPlayer.onAlbumHover(event);
				});

			_clone.bind('contextmenu', 
				function(event)
				{
					var artist = _clone.data('artist');
					var album = _clone.data('album');
					
					menus.showAlbumMenu(albumArtwork, artist, album);

					return false;
				});

			albumArtwork.mouseout(
				function(event)
				{
					musicPlayer.onAlbumOut(event);
				});

			albumArtwork.bind('menuOpened', 
				function()
				{
  					albumArtwork.toggleClass('menuOpen');
				});

			albumArtwork.bind('menuClosed', 
				function()
				{
  					albumArtwork.toggleClass('menuOpen');
				});

			albumImageSmall.one('error', 
				function() 
				{ 
					this.src = 'images/defaultArtwork.png';

					albumImageSmall.css('opacity', '0.6');

					var altAlbumArtwork = $("<div class='altAlbumArtwork'></div>");
					altAlbumArtwork.html(_albumArtist + '<br />' + _album);

					_clone.find(".albumArtwork").append(altAlbumArtwork);
				});
		})();

		var encodedURL = _albumArtist + '_' + _album;

		encodedURL = encodedURL.replace(/[^\w\s]/gi, '');
		encodedURL = encodeURI(encodedURL);
		
		var imageURL = 'getArtwork?' + encodedURL;

		albumImageSmall.attr('src', imageURL);
		albumImageSmall.attr('alt', _albumArtist + ' - ' + _album);

		_clone.data("artist", _albumArtist);
		_clone.data("album", _album);
		_clone.data("year", _year);

		return _clone;
	}

	return {
		getElement: function()
		{
			return getElement();
		},

		setInfo: function(albumArtist, album, year)
		{
			_year = year;
			_album = album;
			_albumArtist = albumArtist;
		},
	};
}

function FileEntry(templateElement)
{
	var _file = null;
	var _clone = $(templateElement).clone();

	function getElement()
	{
		var imgPath = 'images/file.png';

		if (_file.folder)
			imgPath = 'images/folder.png';

		_clone.find(".fileName").html(_file.name);
		_clone.find(".fileIconImg").attr('src', imgPath);

		_clone.data("file", _file);

		(function()
		{
			_clone.click(
				function(event)
				{
					$(".fileEntry.selected").toggleClass("selected");
					_clone.toggleClass("selected");
					
					$("#filePicker").trigger("itemClick");
				});

			_clone.dblclick(
				function(event)
				{
					$("#filePicker").trigger("itemDblClick");
				});
		})();

		return _clone;
	}

	return {
		getElement: function()
		{
			return getElement();
		},

		setInfo: function setInfo(file)
		{
			_file = file;
		}
	}; 
}