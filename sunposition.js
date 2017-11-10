// https://www.nrel.gov/docs/fy08osti/34302.pdf
	var getSunPosition = function() {
		var now = new Date(),
			longitude = localPosition.longitude,
			latitude = localPosition.latitude;
		
		var julianDate = getJulianDay(now),
			julianCentury = (julianDate - 2451545) / 36525;
			
		var sunRadius = sunRadiusVector(julianCentury),
			rightAscension = sunRightAscension(julianCentury),
			declination = sunDeclination(julianCentury),
			sunTime = sunEquationTime(julianCentury);

		var solarTimeFix = sunTime - 4 * longitude,
			trueSolarTime = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60 + solarTimeFix;

		while (trueSolarTime > 1440) {
			trueSolarTime -= 1440;
		}

		var hourAngle = trueSolarTime / 4 - 180;

		if (hourAngle < -180)
			hourAngle += 360;

		var csZenith = Math.sin(degToRad(latitude)) * Math.sin(degToRad(declination)) + 
				Math.cos(degToRad(latitude)) * Math.cos(degToRad(declination)) * Math.cos(degToRad(hourAngle));

		if (csZenith > 1) {
			csZenith = 1;
		} else if (csZenith < -1) { 
			csZenith = -1; 
		}

		var zenith = radToDeg(Math.acos(csZenith)),
			azDenom = Math.cos(degToRad(latitude)) * Math.sin(degToRad(zenith)),
			azimuth, exoatmElevation, refractionCorrection, solarZenith;

		if (Math.abs(azDenom) > 0.001) {
			azRad = ((Math.sin(degToRad(latitude)) * Math.cos(degToRad(zenith))) -  Math.sin(degToRad(declination))) / azDenom;

			if (azRad > 1)
				azRad = 1;
			if (azRad < -1)
				azRad = -1

			azimuth = 180 - radToDeg(Math.acos(azRad));
			if (hourAngle > 0)
				azimuth = -azimuth;

		} else {
			azimuth = (lat > 0) ? 180 : 0;
		}

		if (azimuth < 0)
			azimuth += 360;

		exoatmElevation = 90 - zenith;

		if (exoatmElevation > 85) {
			refractionCorrection = 0;
		} else {
			te = Math.tan(degToRad(exoatmElevation));
			if (exoatmElevation > 5) {
				refractionCorrection = 58.1 / te - 0.07 / Math.pow(te, 3) + 0.000086 / Math.pow(te, 5);
			} else if (exoatmElevation > -0.575) {
				refractionCorrection = 1735 + exoatmElevation * (-518.2 + exoatmElevation * (103.4 + exoatmElevation * (-12.79 + exoatmElevation * 0.711)));
			} else {
				refractionCorrection = -20.774 / te;
			}

			refractionCorrection = refractionCorrection / 3600;
		}

		solarZenith = 90 - (zenith - refractionCorrection);

		console.log({ azimuth, solarZenith, zenith, hourAngle, trueSolarTime, declination });

		return {
			azimuth: azimuth,
			elevation: solarZenith
		}
	}


	var getJulianDay = function(date = new Date()) {
		var year = date.getUTCFullYear(),
			month = date.getUTCMonth() + 1,
			day = date.getUTCDate(),
			hours = date.getUTCHours(),
			minutes = date.getUTCMinutes(),
			seconds = date.getUTCSeconds(),
			dayFraction = day + hours / 24 + minutes / (24 * 60) + seconds / (24 * 60 * 60);

		if (month < 3) {
			year--;
			month += 12
		}

		var b = 2 - Math.floor(year / 100) + Math.floor(year / 400);

		return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + dayFraction + b - 1524.5;
	}


	var degToRad = function(phi) {
		return Math.PI * phi / 180;
	}

	var radToDeg = function(phi) {
		return 180 * phi / Math.PI;
	}

	var limit360 = function(phi) {
		if (phi > 360) {
			phi = 360 * phi % 360;
		} else if (phi < 0) {
			phi = 360 - 360 * phi % 360;
		}

		return phi;
	}

	var sunMeanAnomaly = function(julianCentury) {
		return 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury);
	}

	var sunEquationCenter = function(julianCentury) {
		var anomaly = degToRad(sunMeanAnomaly(julianCentury)),
			sin2m = Math.sin(2 * anomaly),
			sin3m = Math.sin(3 * anomaly);

		return Math.sin(anomaly) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) + sin2m * (0.019993 - 0.000101 * julianCentury) + sin3m * 0.000289;
	}

	var sunTrueAnomaly = function(julianCentury) {
		return sunMeanAnomaly(julianCentury) + sunEquationCenter(julianCentury);
	}

	var earthEccentricity = function(julianCentury) {
		return 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
	}

	var sunRadiusVector = function(julianCentury) {
		var anomaly = sunTrueAnomaly(julianCentury),
			eccentricity = earthEccentricity(julianCentury);
	 
		return 1.000001018 * (1 - Math.pow(eccentricity, 2)) / (1 + eccentricity * Math.cos(degToRad(anomaly)));
	}



	var eclipticMeanObliquity = function(julianCentury) {
		var seconds = 21.448 - julianCentury * (46.8150 + julianCentury * (0.00059 - 0.001813 * julianCentury));
		return 23 + (26 + (seconds / 60)) / 60;
	}


	var eclipticCorrectedObliquity = function(julianCentury) {
		return eclipticMeanObliquity(julianCentury) + 0.00256 * Math.cos(degToRad(125.04 - 1934.136 * julianCentury));
	}

	var sunMeanLongitude = function(julianCentury) {
		return limit360(280.46646 + julianCentury * (36000.76983 + 0.0003032 * julianCentury));
	}


	var sunTrueLongitude = function(julianCentury) {
		return sunMeanLongitude(julianCentury) + sunEquationCenter(julianCentury);
	}


	var sunApparentLongitude = function(julianCentury) {
		return sunTrueLongitude(julianCentury) - 0.00569 - 0.00478 * Math.sin(degToRad(125.04 - 1934.136 * julianCentury));
	}


	var sunRightAscension = function(julianCentury) {
		var obliquity = degToRad(eclipticCorrectedObliquity(julianCentury)),
			longitude = degToRad(sunApparentLongitude(julianCentury));
	 
		return radToDeg(Math.atan2(Math.cos(obliquity) * Math.sin(longitude), Math.cos(longitude)));
	}


	var sunDeclination = function(julianCentury) {
		var obliquity = eclipticCorrectedObliquity(julianCentury),
			longitude = sunApparentLongitude(julianCentury);

		return radToDeg(Math.asin(Math.sin(degToRad(obliquity)) * Math.sin(degToRad(longitude))));
	}

	var sunEquationTime = function(julianCentury) {
		var obliquity = eclipticCorrectedObliquity(julianCentury),
			longitude = degToRad(sunMeanLongitude(julianCentury)),
			eccentricity = earthEccentricity(julianCentury),
			anomaly = degToRad(sunMeanAnomaly(julianCentury));

		var y = Math.pow(Math.tan(degToRad(obliquity) / 2), 2),
			time = y * Math.sin(2 * longitude) - 2 * eccentricity * Math.sin(anomaly) +
					4 * eccentricity * y * Math.sin(anomaly) * Math.cos(2 * longitude) -
					0.5 * y * y * Math.sin(4 * longitude) - 1.25 * eccentricity * eccentricity * Math.sin(2 * anomaly);

		return 4 * radToDeg(time);
	}