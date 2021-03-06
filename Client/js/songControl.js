var MusicPlayer = window.MusicPlayer || {};

var cookieHelpers = MusicPlayer.cookieHelpers;

MusicPlayer.songControl = (function()
{
	var _nextTrackElement = null;
	var _nextSongPreloaded = false;

	function updateControlButtons()
	{
		var playButton = $('#playButtonImg');
		var audioElement = musicPlayer.getAudioElement();
		
		if (audioElement.paused)
		{
			playButton.attr('src', 'images/play.png');
		}
		else
		{
			playButton.attr('src', 'images/pause.png');
		}
	};

	function onCanPlay()
	{
		updateControlButtons();

		musicPlayer.setPlayingAlbum();
		musicPlayer.updateNowPlayingTrack();

		var trackTime = musicPlayer.getTrackSeconds();

		$("#currentPlaying").attr('totalTime', trackTime);
		$("#seekBar").attr('max', trackTime);
	}

	function onPlay()
	{
		updateControlButtons();

		musicPlayer.setPlayingAlbum();
		musicPlayer.updateNowPlayingTrack();

		cookieHelpers.setCookie('wasPlaying', true);
	}

	function onPause()
	{
		updateControlButtons();
		musicPlayer.updateNowPlayingTrack();

		cookieHelpers.setCookie('wasPlaying', false);
	}

	function getFormattedTime(totalSeconds)
	{
		var minutes = Math.floor(totalSeconds / 60);

		var minsInSecs = minutes * 60;
		var seconds = Math.floor(totalSeconds) - minsInSecs;

		if (seconds < 10)
			seconds = '0' + seconds;

		return minutes + ':' + seconds;
	}

	function onTimeUpdate()
	{
		var audioElement = musicPlayer.getAudioElement();

		var totalSeconds = parseInt($("#currentPlaying").attr('totalTime'));
		var progPercent = audioElement.currentTime / totalSeconds * 100;

		if (progPercent > 75 && !_nextSongPreloaded)
		{
			_nextSongPreloaded = true;
			preLoadNextTrack();
		}

		var formattedTime = getFormattedTime(audioElement.currentTime);

		var currentTime = $("#currentTime");
		currentTime.html(formattedTime);

		var songProgress = $("#songProgress");

		if (progPercent > 100)
			progPercent = 0;

		songProgress.css('width', progPercent + '%');

		cookieHelpers.setCookie('lastTime', audioElement.currentTime);
		musicPlayer.updateControlBarBackBtn(audioElement.currentTime);
	}

	function onTrackEnded()
	{
		_nextSongPreloaded = false;

		if (!_nextTrackElement)
		{
			musicPlayer.clearControlBar();
			return;
		}

		var audioElement = $("#currentPlaying");
		
		audioElement.replaceWith(_nextTrackElement);
		audioElement = _nextTrackElement;

		_nextTrackElement = null;

		playSong();
	}

	function preLoadNextTrack()
	{
		var nextTrackID = musicPlayer.getNextTrackID();

		// If the track ID is -1 then it's the end of the album.
		if (nextTrackID == -1)
			return;

		createTempAudioElement(nextTrackID);	
	}

	function createTempAudioElement(nextTrackID)
	{
		var audioElement = musicPlayer.getAudioElement();

		_nextTrackElement = $(audioElement).clone();

		_nextTrackElement.attr('trackID', nextTrackID);

		_nextTrackElement.attr('autoplay', false);
		_nextTrackElement.attr('preload', 'auto');
		_nextTrackElement.attr('src', 'http://' + window.location.hostname + ':3002/' + nextTrackID + '.mp3');

		bindAudioElementEvents(_nextTrackElement);
	}

	function bindAudioElementEvents(audioElement)
	{
		if (!audioElement)
			audioElement = $(musicPlayer.getAudioElement());

		audioElement.bind('timeupdate', onTimeUpdate);
		audioElement.bind('ended', onTrackEnded);

		audioElement.bind('pause', onPause);
		audioElement.bind('canplay', onCanPlay);
		audioElement.bind('play', onPlay);
	}

	function fadeOutSong(trackID, paused)
	{
		var audioElement = musicPlayer.getAudioElement();
		
		musicPlayer.setCurrentTrackID(trackID);
		
		$(audioElement).animate({ volume: 0 }, 500, 'swing',
			function()
			{
				playSong(trackID, paused);
			});
	}

	function playSong(trackID, paused)
	{
		_nextTrackElement = null;

		var audioElement = musicPlayer.getAudioElement();
		audioElement.volume = musicPlayer.getCurrentVolume();
		
		if (trackID)
		{
			$(audioElement).attr('trackID', trackID);

			audioElement.src = 'http://' + window.location.hostname + ':3002/' + trackID + '.mp3';			
			audioElement.load();
		}
		else
		{
			trackID = parseInt($(audioElement).attr('trackID'));
		}

		musicPlayer.setCurrentTrackID(trackID);

		if (!paused)
			audioElement.play();
	}

	function playNextSong()
	{
		var trackID = musicPlayer.getNextTrackID();

		// If the track ID is -1 then it's the end of the album.
		if (trackID == -1)
			return;

		fadeOutSong(trackID);
	}

	function playLastSong()
	{
		var audioElement = musicPlayer.getAudioElement();
		var progSeconds = Math.ceil(audioElement.currentTime);

		if (progSeconds > 5)
		{
			playSong(musicPlayer.getCurrentTrackID());
			return;
		}

		var trackID = musicPlayer.getLastTrackID();

		if (trackID == -1)
			return;

		fadeOutSong(trackID);
	}

	return {
		togglePlay: function()
		{
			var audioElement = musicPlayer.getAudioElement();

			if (audioElement.paused)
			{
				audioElement.play();
				$(audioElement).animate({ volume: musicPlayer.getCurrentVolume() }, 500);
			}
			else
			{
				$(audioElement).animate({ volume: 0 }, 500, 'swing',
					function()
					{
						audioElement.pause();
					});
			}
		},

		fadeOutSong: function(trackID, paused)
		{
			fadeOutSong(trackID, paused);
		},

		playSong: function(trackID, paused)
		{
			playSong(trackID, paused);
		},

		playNextSong: function()
		{
			playNextSong();
		},

		playLastSong: function()
		{
			playLastSong();
		},

		setupAudioElement: function(callback)
		{
			var audioElement = musicPlayer.getAudioElement();
    		//audioElement.volume = 0.1;

    		bindAudioElementEvents();

			if (callback)
				callback();
		},
	};
}());