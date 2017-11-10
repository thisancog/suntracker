(function() {

	// Get elevation and azimuth of sun position in sky for a given time and place
	var getSunPosition = function() {
		var now = new Date(),
			julianTime = getJulianTime(
				now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
				now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

		var twoPI = 2 * Math.PI,
			deg2Rad = Math.PI / 180;


		// Ecliptic coordinates
		var meanLongitude = (280.46  + 0.9856474 * julianTime) % 360,
			meanAnomaly   = (357.529 + 0.9856003 * julianTime) % 360;
		if (meanLongitude < 0)	meanLongitude += 360;
		if (meanAnomaly < 0)	meanAnomaly += 360;
		meanAnomaly *= deg2Rad;


		// Ecliptic longitude and obliquity of ecliptic
		var eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) % 360,
			eclipticObliquity = 23.439 - 0.0000004 * julianTime;
		if (eclipticLongitude < 0) eclipticLongitude += 360;
		eclipticLongitude *= deg2Rad;
		eclipticObliquity *= deg2Rad;


		// Celestial coordinates
		var declination = Math.asin(Math.sin(eclipticLongitude) * Math.sin(eclipticObliquity)),
			numerator = Math.sin(eclipticLongitude) * Math.cos(eclipticObliquity),
			denominator = Math.cos(eclipticLongitude),
			rightAscension = Math.atan(numerator / denominator);
		if (denominator < 0)					rightAscension += Math.PI;
		if (denominator >= 0 && numerator < 0)	rightAscension += twoPI;


		// Local coordinates, Greenwhich Sidereal Mean Time
		var gmst = (6.697375 + 0.0657098242 * julianTime + now.getUTCHours()) % 24;
		if (gmst < 0) gmst += 24;


		// Local mean sidereal time
		var lmst = (gmst + localPosition.longitude / 15) % 24;
		if (lmst < 0) lmst += 24;
		lmst *= 15 * deg2Rad;


		// Hour angle
		var hourAngle = lmst - rightAscension;
		if (hourAngle < - Math.PI)		hourAngle += twoPI;
		else if (hourAngle > Math.PI)	hourAngle -= twoPI;


		// Latitude to radians
		localPosition.latitude *= deg2Rad;

		// Solar zenith, azimuth and elevation
		var temp = Math.sin(localPosition.latitude) * Math.sin(declination) +
				   Math.cos(localPosition.latitude) * Math.cos(declination) * Math.cos(hourAngle),
			zenithAngle = Math.acos(temp),
			elevation = Math.asin(temp),
			azimuth = Math.acos(
						(Math.sin(localPosition.latitude) * Math.cos(zenithAngle) - Math.sin(declination)) /
						(Math.cos(localPosition.latitude) * Math.sin(zenithAngle)));
		elevation /= deg2Rad;
		azimuth /= deg2Rad;
		localPosition.latitude /= deg2Rad;


		// Azimuth correction for hour angle
		if (hourAngle > 0)	azimuth += 180;
		else				azimuth = 540 - azimuth;
		azimuth = azimuth % 360;

		lastUpdate = now;
		return { azimuth, elevation };
	}


	// Convert time to difference from noon, 01.01. 2000 in Julian Calendar
	var getJulianTime = function(year, month, day, hours, minutes, seconds) {
		var months = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30],
			delta = (year - 1949),
			leap = Math.floor(delta / 4);

		day += months.slice(0, month + 1).reduce(function(acc, val) { return acc + val; },0);
		if (is_leapyear(year) && day >= 60 && !(month === 2 && day === 60))
			day += 1;

		hours += minutes / 60 + seconds / 3600;

		var jd = 32916.5 + 365 * delta + leap + day + hours / 24;
		return jd - 51545;

	}


	// Check if a year is a leap year
	var is_leapyear = function(year) {
		if      (year % 400 == 0)	return true;
		else if (year % 100 == 0)	return false;
		else if (year %   4 == 0)	return true;
		else						return false;
	}




})();