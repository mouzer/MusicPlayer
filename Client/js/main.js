var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.engine = (function()
{
	var connect = MusicPlayer.connect;
	var songControl = MusicPlayer.songControl;
	var dialogs = MusicPlayer.dialogs;
	var menus = MusicPlayer.menus;
	var cookieHelpers = MusicPlayer.cookieHelpers;

	var msgHandlers = {};

	var _currentTrackID = -1;

	var _resumeData = {};

	var _currentAlbumEntry = null;
	var _showingAlbumEntry = null;
	var _playingAlbumEntry = null;

	var _albumTracks = [];
	var _currentAlbumTracks = [];

	var _albumViewOpen = false;
	var _gettingTracks = false;

	var _currentVolume = 1;

	(function()
	{
		$(window).resize(
			function()
			{
				resizeDialogs();
				resizeAlbumContainer();
				resizeTextToFit($("#albumName"));
				resizeArtwork($("#albumImageLarge"));
	   		});
	})();

	function onWebSockOpen()
	{
		console.log('Connected!');
	}

	function onWebSockMessage(event)
	{
		var reply = JSON.parse(event.data);

		if (reply.error)
		{
			alert(reply.error);
			clearResumeData();

			return;
		}

		var callback = msgHandlers[reply.command];

		if (!callback)
		{
			alert('Invalid reply data.');
			return;
		}

		var replyData = reply.data;
		callback(replyData);
	}

	function initialize()
	{
		$("body").mCustomScrollbar(
			{
				theme: "minimal-dark",
				setTop: 0,
				mouseWheel:
				{
					scrollAmount: 300,
				},
				advanced:
				{
					updateOnImageLoad: false,
				},
				callbacks:
				{
        			onScrollStart:
        			function()
        			{
            			closeMenus($(".menus")[0])
        			}
    			}
			});

		$("#tracksContainer").mCustomScrollbar(
			{
				theme: "minimal-dark",
				setTop: 0,
				advanced:
				{
					updateOnImageLoad: false,
				}
			});

		$(".modalContent").mCustomScrollbar(
			{
				theme: "minimal-dark",
				setTop: 0,
			});

		$("#fileViewContainer").mCustomScrollbar(
		{
			theme: "minimal-dark",
			setTop: 0,
		});

		$("input").attr('maxlength', 255);

		resizeAlbumContainer()
		closeTracks();

        songControl.setupAudioElement();

		loadResumeData();
		resumePlayback();

        setupHandlers();

		startGettingAlbums();
		updateNowPlayingTrack();
	}

	function setupHandlers()
	{
		dialogs.initDialogs();

		$(".menus").mouseup(
			function (event)
			{
				closeMenus(event.target);
			});
	
		$("#closeTracksLink").click(
			function()
			{
				musicPlayer.closeTracks();
			});

		$("#playButton").click(
			function()
			{
				songControl.togglePlay();
			});

		$("#fwButton").click(
			function()
			{
				songControl.playNextSong();
			});

		$("#bkButton").click(
			function()
			{
				songControl.playLastSong();
			});

		$("#seekBar").change( 
			function() 
			{ 
            	var audioElement = getAudioElement();
            	audioElement.currentTime = $(this).val(); 
        	});

		$("#addMusic").click(
			function()
			{
				menus.showAddMenu($(this));
			});

		$("#addMusicBtn").click(
			function()
			{
				addFolders();
			});

		$("#showAbout").click(
			function()
			{
				showAbout();
			});

		$("#power").click(
			function()
			{				
				close();
			});

		$(".menuBarBtn").bind('menuOpened', 
			function()
			{
				$(this).toggleClass('menuOpen');
			});

		$(".menuBarBtn").bind('menuClosed', 
			function()
			{
				$(this).toggleClass('menuOpen');
			});

		$("#songInfo").click(
			function()
			{
				var artist = _currentAlbumEntry.data('artist');
				var album = _currentAlbumEntry.data('album');

				getAlbumTracks(artist, album,
					function(data)
					{
						_showingAlbumEntry = _currentAlbumEntry;
						processAlbumTracks(data, true);
					});
			});

		$(document).keydown(
			function(event)
			{
				if (event.which == 27)
				{
					closeTracks();
				}
			});

		function onVolumeChange(value)
		{
	    	console.log('Volume: ' + value);

	    	var audioElement = getAudioElement();
	    	audioElement.volume = value / 100;

			setCookie('lastVolume', value);
		}

		$("#volumeContainer").knobKnob(
		{
		    snap : 10,
		    value: 359 * getCookie('lastVolume'),
		    turn : function(ratio)
		    {
		    	console.log('Volume: ' + ratio);

		    	var audioElement = getAudioElement();
		    	audioElement.volume = ratio;

		    	_currentVolume = ratio;
				setCookie('lastVolume', ratio);
		    }
		});
	}

	function closeMenus(target)
	{
		var container = $(".menus");

		if (container.is(target))
		{
			var parent = $(".menuOpen");
		 	parent.trigger('menuClosed');

		 	container.children().hide();
		    container.hide();
		}
	}

	function resizeDialogs()
	{
		var height = $("#dialogContainer").height();

		$("#dialogContainer").children().each(
			function() 
			{
				var dialog = $(this);
				var maxHeight = parseInt(dialog.css('max-height'));

				if (maxHeight == 0)
					return;

				var newHeight = Math.min(height - 150, maxHeight);
				dialog.css('height', newHeight);
			});
	}

	function getAudioElement()
	{
		return $("#currentPlaying")[0];
	}

	function loadResumeData()
	{
		getCookie('lastAlbum');
		getCookie('lastArtist');
		getCookie('lastYear');
		getCookie('lastSongID');
		getCookie('wasPlaying');
		getCookie('lastTime');
		getCookie('lastVolume');
	}

	function clearResumeData()
	{
		setCookie('lastAlbum', null);
		setCookie('lastArtist', null);
		setCookie('lastYear', null);
	 	setCookie('lastSongID', null);
		setCookie('wasPlaying', null);
		setCookie('lastTime', null);
		setCookie('lastVolume', null);
	}

	function resumePlayback()
	{
		if (_resumeData.lastVolume != null)
			$(".knob").val(_resumeData.lastVolume).trigger('change');

		if (_resumeData.lastArtist == null || _resumeData.lastAlbum == null)
			return;

		getAlbumTracks(_resumeData.lastArtist, _resumeData.lastAlbum,
			function(data)
			{
				_currentAlbumEntry = getAlbumEntry(_resumeData.lastArtist, _resumeData.lastAlbum, _resumeData.lastYear)

				processAlbumTracks(data, false,
					function()
					{
						if (_resumeData.lastSongID == null)
							return;

						var paused = _resumeData.wasPlaying == "false";
						playSong(_resumeData.lastSongID, paused);

						var audioElement = getAudioElement();
						audioElement.currentTime = _resumeData.lastTime;
					});
			});
	}

	function getAlbumEntry(artist, album, year)
	{
		var albums = $(".albumEntry");

		for (var cnt = 0; cnt < albums.length; cnt++)
		{
			var tmpEntry = albums.eq(cnt);

			if (tmpEntry.data('album') == album && tmpEntry.data('artist') == artist)
				return tmpEntry;
		}

		var albumTemplate = $(".templates").find('.albumEntry')[0];
		var tmpEntry = new AlbumEntry(albumTemplate);

		tmpEntry.setInfo(artist, album, year);
		return tmpEntry.getElement();
	}

	function getAllAlbums(callback, progressCallback)
	{
		var _albumList = [];

		var _albumCount = 0;
		var _albumOffset = 0;
		var _albumProgress = 0;

		var _callback = callback;
		var _progressCallback = progressCallback;

		getAlbumCount();

		function getAlbumCount()
		{
			var queryData = { };
			connect.sendQuery('getAlbumCount', queryData);
		}

		msgHandlers['getAlbumCountReply'] = function(data)
		{
			_albumCount = data.albumCount;

			_progressCallback(_albumProgress, _albumCount);
			getAlbums();
		}

		function getAlbums()
		{
			if (_albumCount == 0)
			{
				_callback();
				return;
			}

			var albumsRemaning = _albumCount - _albumOffset;
			var albumsToGet = Math.min(200, albumsRemaning);

			var queryData = { offset: _albumOffset, albumsToGet: albumsToGet };
			connect.sendQuery('getAlbums', queryData);
		}

		msgHandlers['getAlbumsReply'] = function(data)
		{
			_albumOffset += data.albumCount;
			
			_albumProgress += data.albumCount;
			_albumList = _albumList.concat(data.albumData);

			_progressCallback(_albumProgress, _albumCount);
			_callback(data.albumData);

			if (_albumOffset >= _albumCount)
				return;

			getAlbums();
		}
	}

	function setPlayingAlbum()
	{
		if (_currentAlbumEntry == _playingAlbumEntry)
			return;

		clearPlayingAlbum();
		_playingAlbumEntry = _currentAlbumEntry;

		var albumImg = _currentAlbumEntry.find(".albumImageSmall");

		albumImg.addClass("currentAlbum");
		albumImg.addClass("glow");
	}

	function clearPlayingAlbum()
	{
		var currentAlbum = $(".currentAlbum");

		currentAlbum.removeClass('glow');
		currentAlbum.removeClass('currentAlbum');

		_playingAlbumEntry = null;
	}

	function clearTitleBar()
	{
		document.title = 'MusicPlayer';
	}

	function chooseAlbum(event, callback)
	{
		if (!event)
			callback();

		var albumEntry = $(event.currentTarget);

		_showingAlbumEntry = albumEntry;

		var album = albumEntry.data('album');
		var artist = albumEntry.data('artist');

		getAlbumTracks(artist, album, callback);
	}

	function getAlbumTracks(artist, album, callback)
	{
		if (_gettingTracks)
			return;

		_gettingTracks = true;

		$("div").toggleClass('busy');

		var queryData = { artist: artist, album: album };
		connect.sendQuery('getTracks', queryData);

		msgHandlers['getTracksReply'] = function(data)
		{
			_gettingTracks = false;
			$("div").toggleClass('busy');

			if (callback)
				callback(data, true);
		}
	}

	function resizeArtwork(artworkTag, callback)
	{
		if (!artworkTag)
			return;

		var parentTag = $(artworkTag).parent();
		var imageSide = Math.min(parentTag.width() - 40, parentTag.height() - 16);

		imageSide = Math.min(imageSide, 800);
		imageSide = Math.max(imageSide, 200);

		var maxWidth = imageSide; 					// Max width for the image
        var maxHeight = imageSide;					// Max height for the image
        
        var ratio = 0;  							// Used for aspect ratio
        
        var width = artworkTag.width();    			// Current image width
        var height = artworkTag.height(); 			// Current image height

		ratio = maxWidth / width;   				// get ratio for scaling image
		
		artworkTag.css('width', maxWidth); 			// Set new width
		artworkTag.css('height', height * ratio);  	// Scale height based on ratio

		ratio = maxHeight / height; 				// get ratio for scaling image

		artworkTag.css('height', maxHeight);   		// Set new height

		var trackList = $("#tracks");

		var trackListTop = 0;
		var trackListHeight = trackList.height();

		if (maxHeight > trackListHeight)
			trackListTop = (maxHeight / 2) - (trackList.height() / 2);

		$("#tracksContainer").css('top', trackListTop);

		if (callback)
			callback();
	}

	function resizeAlbumContainer(callback)
	{
		var albumContainer = $("#albumsContainer");
		var albumTemplate = $(".templates").find(".albumEntry");

		var albumContainerParent = albumContainer.parent();		

		var albumsToFit = Math.floor((albumContainerParent.width() - 30) / albumTemplate.width());
		var containerWidth = albumsToFit * albumTemplate.width();
		
		albumContainer.css('width', containerWidth);

		alignHeaderText(albumContainer, callback)
	}

	function alignHeaderText(anchor, callback)
	{
		var header = $("#header");
		var albumName = $("#albumName");
		var albumView = $("#albumView");

		var width = parseInt(anchor.css('width')) - parseInt(header.css('padding-left'));

		header.css('margin-left', anchor.css('margin-left'));
		header.css('width', width);
		
		albumName.css('max-width', width - 100);

		albumView.css('margin-left', anchor.css('margin-left'));
		albumView.css('width', width);

		if (callback)
			callback();
	}

	function processAlbumTracks(data, showAlbum, callback)
	{
		if (!data)
			return;

		var trackTemplate = $(".templates").find('.trackEntry')[0];

		if (!trackTemplate)
			return;

		var trackContainer = $('#tracks');
		var trackList = data.trackList;

		_albumTracks = [];
		trackContainer.empty();

		for (cnt = 0; cnt < trackList.length; cnt++)
		{
			(function(track)
			{
				if (!track)
					return;

				var newTrack = new TrackEntry(trackTemplate);
				newTrack.setInfo(track, data.artist, data.album);
			
				var newTrackElement = newTrack.getElement();

				_albumTracks.push([track._id, newTrackElement, track]);
				trackContainer.append(newTrackElement);

			}(trackList[cnt]));			
		}

		var albumImage = $("#albumImageLarge");
		var imageURL = 'images/defaultArtwork.png';

		if (data.artwork)
			imageURL = getBlobURLFromData(data.artwork.buffer);

		albumImage.attr('src', imageURL);
		albumImage.attr('alt', data.artist + ' - ' + data.album);

		onAlbumHover(null);

		if (showAlbum)
			showAlbumTracks();

		if (callback)
			callback();
	}

	function showAlbumTracks()
	{
		var albumView = $("#albumView");
		
		_albumViewOpen = true;

		albumView.css('top', '103px');
		albumView.css('bottom', '80px');

		updateNowPlayingTrack();

		$("body").mCustomScrollbar('disable');
		$("#addMusic").toggleClass('hidden');

		resizeArtwork($("#albumImageLarge"));

		setTimeout(
			function()
			{
				var albums = $("#albums");
				albums.css('webkitFilter', 'blur(10px)');
			}, 
			2000);
	}

	function updateProgress(progress, tagCount)
	{
		console.log(progress + ' out of ' + tagCount + ' received.');
	}

	function startGettingAlbums()
	{
		$("#loadingScreen").show();

		$("#appName").css('opacity', '1');
		$("#loadingImage").css('opacity', '1');

		getAllAlbums(displayAlbums, updateProgress);
	}

	function displayAlbums(albumList)
	{
		var albumTemplate = $(".templates").find('.albumEntry')[0];
		var albumContainer = $('#albums');

		if (albumList == null)
		{
			$("#loadingScreen").fadeOut();
			$("#addMusicContainer").show();

			return;
		}

		for (cnt = 0; cnt < albumList.length; cnt++)
		{
			(function(album)
			{
				if (!album)
					return;

				if (album.albumArtist == null || album.album == null)
					return;

				var newAlbum = new AlbumEntry(albumTemplate);
				newAlbum.setInfo(album.albumArtist, album.album, album.year);

				var newAlbumElement = newAlbum.getElement();
				albumContainer.append(newAlbumElement);

				if (!getAudioElement().paused &&
					_resumeData.lastArtist == album.albumArtist && _resumeData.lastAlbum == album.album)
				{
					if (_albumViewOpen)
						_showingAlbumEntry = newAlbumElement;

					_currentAlbumEntry = newAlbumElement;
					setPlayingAlbum();
				}

			}(albumList[cnt]));
		} 

		resizeAlbumContainer(
			function()
			{
				$("#loadingScreen").fadeOut();
			});
	}

	function resizeTextToFit(element, callback)
	{
		element.textfill(
			{
				maxFontPixels: 50,
				explicitWidth: parseInt($("#albumName").css('max-width')),
				explicitHeight: 60,
				complete: 
					function()
					{
						if (callback)
							callback();
					}
			});
	}

	function onAlbumHover(event)
	{
		if (_albumViewOpen == true)
			return;

		var year = null;
		var album = null;
		var artist = null;

		var albumEntry = null;

		if (event != null)
			albumEntry = $(event.currentTarget);	

		if (albumEntry == null && _showingAlbumEntry != null)
			albumEntry = _showingAlbumEntry;

		if (albumEntry)
		{
			album = albumEntry.data('album');
			artist = albumEntry.data('artist');
			year = albumEntry.data('year');
		}

		updateHeaderInfo(artist, album, year);
	}

	function updateHeaderInfo(artist, album, year)
	{
		var headerTag = $("#albumName, #albumYear");

		if (artist == null)
			artist = "MusicPlayer";

		headerTag.fadeOut(100,
			function()
			{
				var albumText = artist;

				if (album)
					albumText += ' - ' + album;

				$("#albumName span").text(albumText);

				var yearText = '';

				if (year)
					yearText = year;

				$("#albumYear span").text(yearText);

				resizeTextToFit($("#albumName"),
					function()
					{
						headerTag.fadeIn(300);
					});
			});
	}

	function onAlbumOut(event)
	{
		// If an album is open we don't want to change the header.

		if (_albumViewOpen == true)
			return;

		if ($(event.toElement).hasClass("albumImageSmall"))
			return;

		onAlbumHover(null);
	}

	function closeTracks()
	{
		var albumView = $("#albumView");
		albumView.css('top', 'calc(100% + 103px)');
		albumView.css('bottom', 'calc(-100% + 80px)');

		$("body").mCustomScrollbar('update');
		$("#addMusic").removeClass('hidden');

		_albumViewOpen = false;
		_showingAlbumEntry = null;

		setTimeout(
			function()
			{
				$("#albums").css('webkitFilter', 'blur(0px)');
			},
			700);
	}

	function getTrackObject(trackID, callback)
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] == trackID)
			{
				callback(_currentAlbumTracks[cnt]);
				return;
			}
		}
	}

	function updateNowPlayingTrack()
	{
		var audioElement = getAudioElement();

		for (var cnt = 0; cnt < _albumTracks.length; cnt++)
		{
			var trackID = _albumTracks[cnt][0];
			var trackElement = _albumTracks[cnt][1];

			var playImage = trackElement.find(".playButtonSmallImg");
			var gradientElement = trackElement.find(".trackGradient");

			if (audioElement.paused || trackID != _currentTrackID)
			{
				gradientElement.css('opacity', '0');

				playImage.attr('src', 'images/play.png');
				playImage.attr('alt', 'Play');
			}
			else
			{
				gradientElement.css('opacity', '1');

				playImage.attr('src', 'images/pause.png');
				playImage.attr('alt', 'Pause');
			}
		}

		if (audioElement.paused)
		{
			clearPlayingAlbum();
		}
		else
		{
			setPlayingAlbum();
		}
		
		updateTitleBar();
		updateControlBarInfo();
	}

	function updateTitleBar()
	{
		getTrackObject(_currentTrackID, 
			function(trackObject)
			{
				var trackInfo = trackObject[2];

				var song = trackInfo.song;
				var artist = trackInfo.albumArtist;

				var title = 'MusicPlayer - ' + artist + ' - ' + song;
				document.title = title;
			});
	}

	function updateControlBarInfo()
	{
		getTrackObject(_currentTrackID, 
			function(trackObject)
			{
				var trackInfo = trackObject[2];

				var song = trackInfo.song;
				var artist = trackInfo.albumArtist;
				var album = trackInfo.album;

				var songInfo = song + '<br />' + artist + '<br />' + album;

				$("#songInfo").html(songInfo);
			});

		if (getLastTrackID() == -1)
		{
			$("#bkButton").addClass("disabled");
		}
		else
		{
			$("#bkButton").removeClass("disabled");
		}

		if (_currentTrackID == -1)
		{
			$("#playButton").addClass("disabled");
		}
		else
		{
			$("#playButton").removeClass("disabled");
		}

		if (getNextTrackID() == -1)
		{
			$("#fwButton").addClass("disabled");
		}
		else
		{
			$("#fwButton").removeClass("disabled");
		}
	}

	function updateControlBarBackBtn(seconds)
	{
		if (seconds > 5)
		{
			$("#bkButton").removeClass("disabled");
			return;
		}

		if (getLastTrackID() == -1)
		{
			$("#bkButton").addClass("disabled");
		}
		else
		{
			$("#bkButton").removeClass("disabled");
		}
	}

	function isTrackInCurrentAlbum(trackID)
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] == trackID)
				return true;
		}

		return false;
	}

	function getNextTrackID()
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] != _currentTrackID)
				continue;
			
			if (cnt + 1 == _currentAlbumTracks.length)
				break;

			return _currentAlbumTracks[cnt + 1][0]; 		
		}

		return -1;
	}

	function getLastTrackID()
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] != _currentTrackID)
				continue;
			
			if (cnt == 0)
				break;

			return _currentAlbumTracks[cnt - 1][0]; 		
		}

		return -1;
	}

	function playSong(trackID, paused)
	{
		if (trackID == _currentTrackID)
		{
			songControl.togglePlay();
			return;
		}

		if (!isTrackInCurrentAlbum(trackID))
			_currentAlbumTracks = _albumTracks;
		
		songControl.fadeOutSong(trackID, paused);

		if (_currentTrackID != _resumeData.lastSongID)
			clearResumeData();
	}

	function getTrackSeconds()
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] == _currentTrackID)
			{
				var trackInfo = _currentAlbumTracks[cnt][2];
				var trackTime = trackInfo.time;

				var result = trackTime.split(':');
				var seconds = parseInt(result[0]) * 60 + parseInt(result[1]);

				return parseInt(seconds);
			}
		}

		return 0;
	}

	function clearControlBar()
	{
		$("#songInfo").html('');
		$("#currentTime").html('');

		_currentAlbumEntry = null;
		setCookie('lastTime', 0);

		clearTitleBar();
		clearPlayingAlbum();
	}

	function getBufferFromDataURL(dataURL) 
	{
		function stringToBuffer(sourceStr) 
		{
			var buffer = new ArrayBuffer(sourceStr.length);
			var arrayBuffer = new Uint8Array(buffer);

			for (var cnt = 0; cnt < arrayBuffer.length; cnt++) 
				arrayBuffer[cnt] = sourceStr.charCodeAt(cnt);

			return arrayBuffer;
		}

		var mimeStart = dataURL.indexOf(':') + 1;
		var mimeEnd = dataURL.indexOf(';');

		var mimeType = dataURL.substr(mimeStart, mimeEnd - mimeStart);
		mimeType.trim();

		var dataStart = dataURL.indexOf(';') + 1;
		var data = dataURL.substr(dataStart);

		if (data.substr(0, 7) == 'base64,')
		{
			dataStart += 7;

			var base64 = dataURL.substr(dataStart);
			data = atob(base64);
		}

		return {
			mimeType: mimeType,
			buffer: stringToBuffer(data)
		}
	}

	function getBlobURLFromData(data)
	{
		var dataURL = 'data:image/jpeg;' + data;
		return getBlobURLFromDataURL(dataURL);
	}

	function getBlobURLFromDataURL(dataURL)
	{
		var artworkBuffer = getBufferFromDataURL(dataURL);

		var arrayBuffer = artworkBuffer.buffer;
		var artworkBlob = new Blob([arrayBuffer], { type: artworkBuffer.mimeType });

		return URL.createObjectURL(artworkBlob);
	}

	function editSong(id)
	{
		var queryData = { id: id };
		connect.sendQuery('getSongInfo', queryData);

		msgHandlers['getSongInfoReply'] = function(data)
		{
			dialogs.editSong(data.songInfo,
				function(newTag)
				{
					queryData = { id: id, tag: newTag };
					connect.sendQuery('updateSongInfo', queryData);
				});
		}

		msgHandlers['updateSongInfoReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function deleteSong(id)
	{
		dialogs.confirmDelete(id,
			function()
			{
				var queryData = { id: id };
				connect.sendQuery('deleteSong', queryData);
			});

		msgHandlers['deleteSongReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function updateFilePickerDlg(path, showFiles, filter)
	{
		if (path == '')
		{
			var lastPath = getCookie('lastPath');

			if (lastPath != null)
				path = lastPath;
		}

		var queryData = { showFiles: showFiles, filter: filter, path: path };
		connect.sendQuery('getFileListing', queryData);  

		msgHandlers['getFileListingReply'] = function(data)
		{
			path = data.path;

			if (path == '')
			{
				path = 'Computer';
			}
			else if (path.length == 2 && path.charAt(path.length - 1) != '\\')
			{
				// Make sure drive has a backslash after it.
				path += '\\';
			}

			var currentDir = $("#currentDir");
			
			currentDir.val(path);
			currentDir.data('path', path);

			var fileView = $("#fileView");
			var fileTemplate = $(".templates").find('.fileEntry')[0];

			fileView.empty();

			for (var cnt = 0; cnt < data.fileList.length; cnt++)
			{
				var file = data.fileList[cnt];

				var fileEntry = new FileEntry(fileTemplate);
				fileEntry.setInfo(file);

				fileView.append(fileEntry.getElement());
			}

			$("#selectedFile").val('');
		}
	}

	function addSongs()
	{
		dialogs.filePicker(true, ['.mp3'],
			function(selectedFile)
			{
				if (!selectedFile)
					return;

				var currentDir = $("#currentDir");
				setCookie('lastPath', currentDir.val());

				var selectedItems = [];
				selectedItems.push(selectedFile);

				var queryData = { itemList: selectedItems };
				connect.sendQuery('addFiles', queryData);

				console.log(selectedFile);
			});

		msgHandlers['addFilesReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function addFolders()
	{
		dialogs.filePicker(false, null,
			function(selectedItem)
			{
				if (!selectedItem)
					return;

				var currentDir = $("#currentDir");
				setCookie('lastPath', currentDir.val());

				var selectedItems = [];
				selectedItems.push(selectedItem);

				var queryData = { itemList: selectedItems };
				connect.sendQuery('addFolders', queryData);

				console.log(selectedItem);
			});

		msgHandlers['addFoldersReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function showAbout()
	{
		dialogs.about();
	}

	function editAlbum(artist, album)
	{
		var queryData = { artist: artist, album: album };
		connect.sendQuery('getAlbumInfo', queryData);

		msgHandlers['getAlbumInfoReply'] = function(data)
		{
			console.log(data.commonTag);

			dialogs.editAlbum(data.commonTag, 
				function(newTag)
				{
					console.log(newTag);

					queryData = { artist: artist, album: album, tag: newTag };
					connect.sendQuery('updateAlbumInfo', queryData);
				});
		}

		msgHandlers['updateAlbumInfoReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function deleteAlbum(artist, album)
	{
		var queryData = { artist: artist, album: album };
		connect.sendQuery('deleteAlbum', queryData);

		msgHandlers['deleteAlbumReply'] = function(data)
		{
			location.reload(true);
		}
	}

	msgHandlers['progress'] = function(data)
	{
		console.log('Progress: ' + data.current + '/' + data.total);
		dialogs.showProgress(data);
	}

	function setCookie(key, value)
	{
		cookieHelpers.setCookie(key, value);
		_resumeData[key] = value;
	}

	function getCookie(key)
	{
		var value = cookieHelpers.getCookie(key);
		_resumeData[key] = value;

		return value;
	}

	return {
		connectWebSocket: function() 
		{
			connect.createWebSocket(onWebSockOpen, onWebSockMessage);
		},

		initialize: function()
		{
			initialize();
		},

		onAlbumHover: function(event)
		{
			onAlbumHover(event);
		},

		onAlbumOut: function(event)
		{
			onAlbumOut(event);
		},

		chooseAlbum: function(event)
		{
			chooseAlbum(event, processAlbumTracks);
		},

		closeTracks: function()
		{
			closeTracks();
		},

		updateNowPlayingTrack: function()
		{
			updateNowPlayingTrack();
		},

		setCurrentTrackID: function(trackID)
		{
			_currentTrackID = trackID;
			setCookie('lastSongID', trackID);
		},

		getCurrentTrackID: function()
		{
			return _currentTrackID;
		},

		playSong: function(trackID, paused)
		{
			playSong(trackID, paused);
		},

		getAudioElement: function()
		{
			return getAudioElement();
		},

		getNextTrackID: function()
		{
			return getNextTrackID();
		},

		getLastTrackID: function()
		{
			return getLastTrackID();
		},

		getTrackTime: function()
		{
			return getTrackTime();
		},

		getTrackSeconds: function()
		{
			return getTrackSeconds();
		},

		getCurrentVolume: function()
		{
			return _currentVolume;
		},

		clearControlBar: function()
		{
			return clearControlBar();
		},

		editSong: function(id)
		{
			editSong(id);
		},

		deleteSong: function(id)
		{
			deleteSong(id);
		},

		getBlobURLFromData: function(data)
		{
			return getBlobURLFromData(data);
		},

		getBufferFromDataURL: function(dataURL)
		{
			return getBufferFromDataURL(dataURL);
		},

		resizeDialogs: function()
		{
			return resizeDialogs();
		},

		updateFilePickerDlg: function(path, showFiles, filter)
		{
			return updateFilePickerDlg(path, showFiles, filter);
		},

		addSongs: function()
		{
			return addSongs();
		},

		addFolders: function()
		{
			return addFolders();
		},

		editAlbum: function(artist, album)
		{
			return editAlbum(artist, album);
		},

		deleteAlbum: function(artist, album)
		{
			return deleteAlbum(artist, album);
		},

		updateControlBarBackBtn: function(seconds)
		{
			updateControlBarBackBtn(seconds);
		},

		setPlayingAlbum: function()
		{
			if (_showingAlbumEntry == null)
				return;

			_currentAlbumEntry = _showingAlbumEntry;

			var artist = _showingAlbumEntry.data('artist');
			var album = _showingAlbumEntry.data('album');
			var year = _showingAlbumEntry.data('year');

			setCookie('lastArtist', artist);
			setCookie('lastAlbum', album);
			setCookie('lastYear', year);
		},
	};
}());