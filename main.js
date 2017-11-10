(function() {

	/************

		ToDo:
			change position depending on compass orientation
			change position depending on device vertical orientation

	 ************/


	// DOM elements
	var canvas, ctx, infos, askpermission;

	// Options
	var updateFrequency = 60 * 1000,
		animationLength = 3 * 1000,
		astronomicalTwilight = -18,
		averageOverNum = 5,
		defaultEasing = 'easeInOutCubic',
		debug = false;

	// Globals
	var	colors = {
			10: { sun: '#FFFF00', zenith: '#0FAFE3', horizon: '#0DACE1' },	// #FFFF00, #13AE33, #0D97C3
			9:  { sun: '#F0E406', zenith: '#0DACE1', horizon: '#05A5D8' },
			8:  { sun: '#F0DE07', zenith: '#05A5D8', horizon: '#2098C9' },
			7:  { sun: '#F2D814', zenith: '#2098C9', horizon: '#1B87B6' },
			6:  { sun: '#F2CB24', zenith: '#1B87B6', horizon: '#1573A1' },
			5:  { sun: '#F4BB31', zenith: '#1573A1', horizon: '#4A6989' },
			4:  { sun: '#F5A63C', zenith: '#4A6989', horizon: '#716273' },
			3:  { sun: '#F39341', zenith: '#716273', horizon: '#8B5A61' },
			2:  { sun: '#F2883F', zenith: '#8B5A61', horizon: '#9B4F4B' },
			1:  { sun: '#ED703D', zenith: '#9B4F4B', horizon: '#A8453C' },
			0:  { sun: '#E94E38', zenith: '#A8453C', horizon: '#A13A30' },
			midnight: { sun: '#E94E38', zenith: '#031117', horizon: '#000000' }
		},
		geo = {
			geolocationAllowed: false,
			lastUpdate: null,
			julianDay: null,
			julianCentury: null,
			latitude: null,
			longitude: null,
			colorZenith: colors[10].zenith,
			colorHorizon: colors[10].horizon,
			alphas: [],
			headings: [],
			gpsDifference: 0,
			compassMethod: null,
			cardinalOrientation: null,
		},
		sun = {
			relativeSize: 0.06,
			radius: 0,
			x: 0,
			y: 0,
			color: colors[10].sun,
			corona: 0,
			dragged: false,
			returnToDefault: false,
			azimuth: 180,
			elevation: 70
		};
	

	var initCanvas = function() {
		canvas = document.querySelector('.sun');
		askpermission = document.querySelector('.askpermission');
		ctx = canvas.getContext("2d");

		if (debug) {
			infos = document.createElement('div');
			infos.classList.add('infos');
			document.body.appendChild(infos);
		}

		defineEvents();
		resizeCanvas();
		getLocalPosition();
	}

	var defineEvents = function() {
		window.addEventListener('resize', resizeCanvas);

		canvas.addEventListener('mousedown', canvasDown);
		canvas.addEventListener('touchstart', canvasDown);

		canvas.addEventListener('mousemove', canvasHover)
		canvas.addEventListener('touchmove', canvasHover)

		canvas.addEventListener('mouseup', canvasUp);
		canvas.addEventListener('touchend', canvasUp);

		askpermission.querySelector('.agree').addEventListener('click', navigatorGeolocation);
		askpermission.querySelector('.disagree').addEventListener('click', ipGeolocation);

		window.addEventListener('deviceorientation', getDeviceOrientation);
		window.addEventListener('deviceorientation', saveAlphas);
	}

	// Initialise system and repeat
	var initSun = function() {
		if (!sun.dragged)
			calculateSunCanvasPosition();

		findColors();
		drawSky();
		drawSun();

		if (debug)
			drawInfos();

		requestAnimationFrame(initSun);
	}


	var findColors = function() {
		var now = new Date();

		if (sun.dragged || sun.returnToDefault) {
			geo.lastUpdate = null;

			var newElevation = {
			//	elevation: mapValue(sun.y, canvas.height + sun.radius, -sun.radius, 0, 90),
				elevation: mapValueCircularReverse(sun.y, canvas.height + sun.radius, -sun.radius, 0, 90),
				noonElevation: sun.noonElevation
			};

			findColorsFromElevation(newElevation);
		} else if (geo.lastUpdate === null || (now - geo.lastUpdate) > updateFrequency) {
			var sunPosition = getSunPosition(now),
				noonPosition = getSunPosition(sunPosition.solarNoon);

			sun.elevation = sunPosition.elevation;
			sun.azimuth = sunPosition.azimuth;
			sun.solarNoon = sunPosition.solarNoon;
			sun.noonElevation = noonPosition.elevation;

			findColorsFromElevation(sun);

			canvas.parentElement.style.backgroundColor = geo.colorZenith;
			geo.lastUpdate = now;
		}
	}


	var findColorsFromElevation = function(position) {
		var progression = position.elevation / position.noonElevation;

		if (progression > 1)
			progression = 1;

		if (progression >= 0) {
			var darkStop = Math.floor(10 * progression),
				lightStop = Math.ceil(10 * progression),
				mixture = 10 * progression - darkStop;

			geo.colorZenith = mixColors(colors[lightStop].zenith, colors[darkStop].zenith, mixture);
			geo.colorHorizon = mixColors(colors[lightStop].horizon, colors[darkStop].horizon, mixture);
			sun.color = mixColors(colors[lightStop].sun, colors[darkStop].sun, mixture);

		} else if (position.elevation >= astronomicalTwilight) {
			var mixture = 1 - position.elevation / astronomicalTwilight;

			geo.colorZenith = mixColors(colors[0].zenith, colors.midnight.zenith, mixture);
			geo.colorHorizon = mixColors(colors[0].horizon, colors.midnight.horizon, mixture);
			sun.color = colors.midnight.sun;
		} else {
			geo.colorZenith = colors.midnight.zenith;
			geo.colorHorizon = colors.midnight.horizon;
			sun.color = colors.midnight.sun;
		}
	}


	var drawSky = function() {
		var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

		gradient.addColorStop(0, geo.colorZenith);
		gradient.addColorStop(1, geo.colorHorizon);

		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = gradient;
		ctx.fill();
	}


	var drawSun = function() {
		ctx.beginPath();
		ctx.arc(sun.x, sun.y, sun.radius, 0, 2 * Math.PI);

		if (sun.corona && sun.corona > 0) {
			var gradient = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.radius),
				end = hexToRGB(sun.color);
			gradient.addColorStop(1 - sun.corona, sun.color);
			gradient.addColorStop(1, 'rgba(' + end.r + ',' + end.g + ',' + end.b + ',0)');
			ctx.fillStyle = gradient;
		} else {
			ctx.fillStyle = sun.color;
		}

		ctx.fill();
	}


	var calculateSunCanvasPosition = function(position) {
		var position = position || sun,
			newX = 270,
			newY = 0.5 * sun.radius;

		if (position !== null) {
			
			var elevation = position.elevation,
				mixPercentage = 1;

			newX = position.azimuth;
			newY = canvas.height + 2 * sun.radius;

			if (elevation > 0) {
			//	newY = mapValue(elevation, 0, 90, canvas.height + sun.radius, -sun.radius);
				newY = mapValueCircular(elevation, 0, 90, canvas.height + sun.radius, -sun.radius);
			}
		}

		if (geo.cardinalOrientation !== null) {
			newX = geo.cardinalOrientation - newX;

			while (newX < 0)   { newX += 360; }
			while (newX > 360) { newX -= 360; };

			newX = mapValue(newX, 0, 360, canvas.width, 0);
		}


		// tween position if dragged just stopped

		if (position.returnToDefault !== false && position.returnToDefault > 0) {
			var easing = ease(position.returnToDefault, defaultEasing);

			newX = lerp(newX, sun.oldX, easing);
			newY = lerp(newY, sun.oldY, easing);

			position.returnToDefault -= 60 / animationLength;

			if (position.returnToDefault <= 0) {
				position.returnToDefault = false;
				sun.oldX = undefined;
				sun.oldY = undefined;
			}
		}

		sun.x = newX;
		sun.y = newY;
	}

	var ease = function(t, type) {
		switch (type) {
			case 'easeInQuad':
				return Math.pow(t, 2);
			case 'easeInCubic':
				return Math.pow(t, 3);
			case 'easeInQuart':
				return Math.pow(t, 4);
			case 'easeOutQuad':
				return t * (2 - t);
			case 'easeOutCubic':
				return (--t) * Math.pow(t, 2) + 1;
			case 'easeOutQuart':
				return 1 - (--t) * Math.pow(t, 3);
			case 'easeInOutQuad':
				return t < 0.5 ? 2 * Math.pow(t, 2) : -1 + (4 - 2 * t) * t;
			case 'easeInOutCubic':
				return t < 0.5 ? 4 * Math.pow(t, 3) : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
			case 'easeInOutQuart':
				return t < 0.5 ? 8 * Math.pow(t, 4) : 1 - 8 * (--t) * Math.pow(t, 3);
			case 'linear':
				return t;
			default:
				return t;
		}
	}


	var drawInfos = function() {
		infos.innerHTML = 'Sun elevation: ' + sun.elevation + '<br/>Sun azimuth: ' + sun.azimuth + '<br/><br/>Long: ' + geo.longitude + '<br/>Lat: ' + geo.latitude + '<br/><br/>Compass direction: ' + geo.cardinalOrientation + '<br/>geolocation allowed: ' + geo.geolocationAllowed + '<br/>GPS difference: ' + geo.gpsDifference + '<br/>compass method: ' + geo.compassMethod;
	}

	var canvasDown = function(e) {
		sun.dragged = isSunHover(e);

		if (sun.dragged) {
			var mousePos = getMousePosition(e);

			sun.dragOffsetX = mousePos.x - sun.x;
			sun.dragOffsetY = mousePos.y - sun.y;
		}
	}

	var canvasHover = function(e) {
		if (sun.dragged) {
			var mousePos = getMousePosition(e);

			sun.x = mousePos.x - sun.dragOffsetX;
			sun.y = mousePos.y - sun.dragOffsetY;
			
			canvas.classList.add('sunhover');
		} else if (isSunHover(e)) {
			canvas.classList.add('sunhover');
		} else {
			canvas.classList.remove('sunhover');
		}
	}

	var canvasUp = function(e) {
		if (sun.dragged) {
			sun.dragged = false;
			sun.returnToDefault = 1;

			sun.oldX = sun.x;
			sun.oldY = sun.y;
			sun.dragOffsetX = undefined;
			sun.dragOffsetY = undefined;
		}
	}

	var isSunHover = function(e) {
		var mousePos = getMousePosition(e);

		return Math.pow(mousePos.x - sun.x, 2) + Math.pow(mousePos.y - sun.y, 2) <= Math.pow(sun.radius, 2);
	}

	var getMousePosition = function(e) {
		return { x: e.offsetX || e.touches[0].clientX, y: e.offsetY || e.touches[0].clientY }
	}

	var lerp = function(start, stop, amount) {
		return start + amount * (stop - start);
	}

	var mixColors = function(color1, color2, percentage) {		
		color1 = RGBToCMYK(hexToRGB(color1));
		color2 = RGBToCMYK(hexToRGB(color2));

		var color = cmykToRGB({
			c: percentage * color1.c + (1 - percentage) * color2.c,
			m: percentage * color1.m + (1 - percentage) * color2.m,
			y: percentage * color1.y + (1 - percentage) * color2.y,
			k: percentage * color1.k + (1 - percentage) * color2.k,
		});

		return RGBToHex(color);
	}

	var hexToRGB = function(color) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
		return { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) };
	}

	var RGBToHex = function(color) {
		return '#' + ("0" + parseInt(color.r, 10).toString(16)).slice(-2) +
					 ("0" + parseInt(color.g, 10).toString(16)).slice(-2) +
					 ("0" + parseInt(color.b, 10).toString(16)).slice(-2);
	}

	var cmykToRGB = function(color) {
		var c = color.c / 100,
			m = color.m / 100,
			y = color.y / 100,
			k = color.k / 100,
			r = 1 - (c * (1 - k) + k),
			g = 1 - (m * (1 - k) + k),
			b = 1 - (y * (1 - k) + k);

		r = Math.round(255 * r);
		g = Math.round(255 * g);
		b = Math.round(255 * b);

		return { r, g, b };
	}

	var RGBToCMYK = function(color) {
		var c = 1 - (color.r / 255),
			m = 1 - (color.g / 255),
			y = 1 - (color.b / 255),
			k = Math.min(c, Math.min(m, y));

		c = (k == 1) ? 100 : 100 * (c - k) / (1 - k);
		m = (k == 1) ? 100 : 100 * (m - k) / (1 - k),
		y = (k == 1) ? 100: 100 * (y - k) / (1 - k);

		return { c, m, y, k: 100 * k };
	}



	// https://www.nrel.gov/docs/fy08osti/34302.pdf
	var getSunPosition = function(date = false) {
		var now = date || new Date();

		var zone = now.getTimezoneOffset() / 60,
			year = now.getFullYear(),
			month = now.getMonth() + 1,
			day = now.getDate(),
			hours = now.getHours(),
			minutes = now.getMinutes(),
			seconds = now.getSeconds(),
			secondsNow = hours + minutes / 60 + seconds / 3600 + zone;

		var julianDay = getJulianDay(year, month, day),
			julianCentury = getJulianCentury(julianDay + secondsNow / 24);


		// Calculate solar position for Julian Century

		var	solarRadiusVector = getSolarRadiusVector(julianCentury),
			solarDeclination = getSolarDeclination(julianCentury),
			equationTime = getEquationOfTime(julianCentury);

		var solarTimeFix = equationTime + 4 * geo.longitude + 60 * zone,
			solarTime = hours * 60 + minutes + seconds / 60 + solarTimeFix;

		while (solarTime > 1440) {
			solarTime -= 1440;
		}


		// Calculate solar zenith and azimuth for current time

		var hourAngle = solarTime / 4 - 180;

		if (hourAngle < -180)
			hourAngle += 360;

		var zenithCos = Math.sin(degToRad(geo.latitude)) * Math.sin(degToRad(solarDeclination)) + 
						Math.cos(degToRad(geo.latitude)) * Math.cos(degToRad(solarDeclination)) * Math.cos(degToRad(hourAngle));

		if (Math.abs(zenithCos) > 1 && zenithCos !== 0)
			zenithCos = Math.sign(zenithCos);

		var zenith = radToDeg(Math.acos(zenithCos)),
			azimuth = (Math.cos(degToRad(geo.latitude)) * Math.sin(degToRad(zenith)));

		if (Math.abs(azimuth) > 0.001) {
			azimuth = ((Math.sin(degToRad(geo.latitude)) * Math.cos(degToRad(zenith))) - Math.sin(degToRad(solarDeclination))) / azimuth;

			if (Math.abs(azimuth) > 1 && azimuth !== 0)
				azimuth = Math.sign(azimuth);

			azimuth = 180 - radToDeg(Math.acos(azimuth));

			if (hourAngle > 0)
				azimuth = - azimuth;

		} else {
			azimuth = (geo.latitude > 0) ? 180 : 0;
		}

		if (azimuth < 0)
			azimuth += 360;


		// Calculate apparent sun position due to athmospheric refraction

		var atmosphericElevation = 90 - zenith,
			refractionCorrection = 0;

		if (atmosphericElevation <= 85) {
			var tanElevation = Math.tan(degToRad(atmosphericElevation));

			if (atmosphericElevation > 5) {
				refractionCorrection = 58.1 / tanElevation - 0.07 / Math.pow(tanElevation, 3) + 0.000086 / Math.pow(tanElevation, 5);
			} else if (atmosphericElevation > -0.575) {
				refractionCorrection = 1735 + atmosphericElevation * (-518.2 + atmosphericElevation *
									   (103.4 + atmosphericElevation * (-12.79 + atmosphericElevation * 0.711)));
			} else {
				refractionCorrection = -20.774 / tanElevation;
			}

			refractionCorrection = refractionCorrection / 3600;
		}

		var solarZenith = zenith - refractionCorrection,
			azimuth = (Math.floor(100 * azimuth)) / 100,
			elevation = (Math.floor(100 * (90 - solarZenith))) / 100;


		// Calculate solar noon

		var solarNoonOffset = 720 - 4 * geo.longitude - equationTime,
			julianCenturyOffset = getJulianCentury(julianDay + solarNoonOffset / 1440),
			equationTimeOffset = getEquationOfTime(julianCenturyOffset),
			solarNoonLocal = 720 - 4 * geo.longitude - equationTimeOffset;

		while (solarNoonLocal < 0) {		solarNoonLocal += 1440; }
		while (solarNoonLocal >= 1440) {	solarNoonLocal -= 1440; }

		var solarNoon = date || new Date(),
			solarNoonHours = Math.floor(solarNoonLocal / 60),
			solarNoonMinutes = Math.floor(solarNoonLocal - 60 * solarNoonHours),
			solarNoonSeconds = Math.floor(60.0 * (solarNoonLocal - 60 * solarNoonHours - solarNoonMinutes) + 0.5);

		if (solarNoonSeconds > 60) {
			solarNoonSeconds = 0;
			solarNoonMinutes += 1;
		}

		if (solarNoonMinutes > 59) {
			solarNoonMinutes = 0;
			solarNoonHours += 1;
		}

		solarNoon.setUTCHours(solarNoonHours);
		solarNoon.setUTCMinutes(solarNoonMinutes);
		solarNoon.setUTCSeconds(solarNoonSeconds);

		return {
			azimuth: azimuth,
			elevation: elevation,
			solarNoon: solarNoon
		}
	}

	var getJulianDay = function(year, month, day) {
		if (month <= 2) {
			year -= 1;
			month += 12;
		}

		var A = Math.floor(year / 100),
			B = 2 - A + Math.floor(A / 4);

		return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
	}

	var getJulianCentury = function(julianDay) {
		return (julianDay - 2451545) / 36525;
	}

	var getSolarRadiusVector = function(julianCentury) {
		var solarAnomaly = getSolarTrueAnomaly(julianCentury),
			eccentricity = getEarthOrbitEccentricity(julianCentury);
 
		return 1.000001018 * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(degToRad(solarAnomaly)));
	}

	var getSolarTrueAnomaly = function(julianCentury) {
		return getSolarGeometricMeanAnomaly(julianCentury) + getSolarEquationOfCenter(julianCentury);
	}

	var getSolarGeometricMeanAnomaly = function(julianCentury) {
		return 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury);
	}

	var getSolarEquationOfCenter = function(julianCentury) {
		var m = getSolarGeometricMeanAnomaly(julianCentury),
			mrad = degToRad(m),
			sinM = Math.sin(mrad),
			sin2M = Math.sin(2 * mrad),
			sin3M = Math.sin(3 * mrad);

		return sinM * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) + sin2M * (0.019993 - 0.000101 * julianCentury) + sin3M * 0.000289;
	}

	var getEarthOrbitEccentricity = function(julianCentury) {
		return 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
	}

	var getSolarDeclination = function(julianCentury) {
		var obliquityCorrection = getEclipticCorrectedObliquity(julianCentury),
			apparentSolarLongitude = getApparentSolarLongitude(julianCentury),
			sin = Math.sin(degToRad(obliquityCorrection)) * Math.sin(degToRad(apparentSolarLongitude));

		return radToDeg(Math.asin(sin));
	}

	var getEclipticCorrectedObliquity = function(julianCentury) {
		var eclipticObliquity = getEclipticMeanObliquity(julianCentury),
			omega = 125.04 - 1934.136 * julianCentury;

		return eclipticObliquity + 0.00256 * Math.cos(degToRad(omega));
	}

	var getEclipticMeanObliquity = function(julianCentury) {
		var seconds = 21.448 - julianCentury * (46.8150 + julianCentury * (0.00059 - 0.001813 * julianCentury));
		return 23 + (26 + (seconds / 60)) / 60;
	}

	var getApparentSolarLongitude = function(julianCentury) {
		var trueSolarLongitude = getTrueSolarLongitude(julianCentury),
			omega = 125.04 - 1934.136 * julianCentury;

		return trueSolarLongitude - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
	}

	var getTrueSolarLongitude = function(julianCentury) {
		return getSolarGeometricMeanLongitude(julianCentury) + getSolarEquationOfCenter(julianCentury);
	}

	var getSolarGeometricMeanLongitude = function(julianCentury) {
		var L0 = 280.46646 + julianCentury * (36000.76983 + 0.0003032 * julianCentury);

		while (L0 > 360) {	L0 -= 360; }
		while (L0 < 0) {	L0 += 360; }

		return L0;
	}

	var getEquationOfTime = function(julianCentury) {
		var eclipticObliquity = getEclipticCorrectedObliquity(julianCentury),
			solarLongitude = degToRad(getSolarGeometricMeanLongitude(julianCentury)),
			earthEccentricity = getEarthOrbitEccentricity(julianCentury),
			meanAnomaly = degToRad(getSolarGeometricMeanAnomaly(julianCentury));

		var y = Math.pow(Math.tan(0.5 * degToRad(eclipticObliquity)), 2),
			sin2Long = Math.sin(2 * solarLongitude),
			sin4Long = Math.sin(4 * solarLongitude),
			cos2Long = Math.cos(2 * solarLongitude),
			sinAnom = Math.sin(meanAnomaly),
			sin2Anom = Math.sin(2 * meanAnomaly);

		var time = y * sin2Long -
				   2 * earthEccentricity * sinAnom +
				   4 * earthEccentricity * y * sinAnom * cos2Long -
				   0.5 * Math.pow(y, 2) * sin4Long -
				   1.25 * Math.pow(earthEccentricity, 2) * sin2Anom;

		return 4 * radToDeg(time);
	}

	var radToDeg = function(angleRad) {
		return 180 * angleRad / Math.PI;
	}

	var degToRad = function(angleDeg) {
		return Math.PI * angleDeg / 180;
	}


	// get local position and execute callbacks
	var getLocalPosition = function() {
		var now = new Date(),
			timestamp = localStorage.getItem('timestamp');

		if (timestamp && Date.parse(timestamp) >= now) {
			geo.latitude = localStorage.getItem('latitude');
			geo.longitude = localStorage.getItem('longitude');
			geo.geolocationAllowed = true;

			initSun();

			askpermission.parentElement.removeChild(askpermission);
			canvas.classList.remove('hidden');
		} else if (navigator.geolocation) {
			askpermission.classList.remove('hidden');
		}
	}

	var navigatorGeolocation = function(callbackSuccess) {
		navigator.geolocation.getCurrentPosition((position) => {
			geo.geolocationAllowed = true;
			saveGeoData(position.coords);
		});

		navigator.geolocation.watchPosition(calculateGPSDifference);
	}

	var ipGeolocation = function() {
		fetch('http://freegeoip.net/json/', { method: 'GET' }).then(function(response) {
			return response.json();
		}).then(function(data) {
			saveGeoData(data);
		}).catch(function(error) {
			console.log(error);
		});
	}

	var saveGeoData = function(data) {
		geo.latitude = data.latitude;
		geo.longitude = data.longitude

		var now = new Date();
		now.setDate(now.getDate() + 7);

		localStorage.setItem('latitude', geo.latitude);
		localStorage.setItem('longitude', geo.longitude);
		localStorage.setItem('timestamp', now.toUTCString());

		askpermission.classList.add('hidden');
		askpermission.parentElement.removeChild(askpermission);
		canvas.classList.remove('hidden');

		initSun();
	}


	var getCompassHeading = function() {
		
	}

	var getDeviceOrientation = function(event) {
		if (event.hasOwnProperty('webkitCompassHeading')) {
			geo.compassMethod = 'webkitCompass';
			geo.cardinalOrientation = Math.round(event.webkitCompassHeading);
		} else if (geo.geolocationAllowed) {
			geo.compassMethod = 'GPS';
			var degrees = - event.alpha - geo.gpsDifference;
			if (degrees < 0)			degrees += 360;
			else if (degrees > 360)		degrees -= 360;
			geo.cardinalOrientation = Math.round(degrees);
		}
	}

	var saveAlphas = function(event) {
		geo.alphas.push(event.alpha);
	}

	var calculateGPSDifference = function(position) {
		var coords = position.coords;
		if (typeof coords.heading !== 'undefined') return;

		if (coords.speed > 1) {
			geo.headings.push(coords.heading);
			if (geo.headings.length >= averageOverNum && alphas.length >= averageOverNum) {
				window.removeEventListener('deviceorientation', saveAlphas);

				geo.gpsDifference = (geo.headings.reduce((acc, val) => { return acc + val; },0) +
								 	 geo.alphas.reduce(  (acc, val) => { return acc + val; },0)) / averageOverNum;
			}
		} else {
			geo.headings = []
		}
	}

	var mapValue = function(value, minOld, maxOld, minNew, maxNew) {
		return (value - minOld) * (maxNew - minNew) / (maxOld - minOld) + minNew;
	}

	// value, minOld and maxOld in degrees
	var mapValueCircular = function(value, minOld, maxOld, minNew, maxNew) {
		value = Math.sin(degToRad(value));
		minOld = Math.sin(degToRad(minOld));
		maxOld = Math.sin(degToRad(maxOld));

		return mapValue(value, minOld, maxOld, minNew, maxNew);
	}

	// minNew and maxNew in degrees
	var mapValueCircularReverse = function(value, minOld, maxOld, minNew, maxNew) {
		var newValue = mapValue(value, minOld, maxOld, Math.sin(minNew), Math.sin(maxNew));
		return radToDeg(Math.asin(newValue));
	}

	var resizeCanvas = function() {
		var width = Math.min(document.documentElement.clientWidth, window.innerWidth || 0),
			height = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);

		canvas.width = width;
		canvas.height = height;
		sun.radius = sun.relativeSize * (width > height ? width : height);
	}

	initCanvas();
})();