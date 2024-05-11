// function init() {
//   script.log("Custom module init");
// }

const test = 0;

function moduleParameterChanged(param) {
  script.log(param.name + " parameter changed");

  if (param.isParameter()) {
    correctedInput = checkAndCorrectTimeInput(param.get());
    param.set(correctedInput);
  }
}

function moduleValueChanged(value) {
  // script.log(value.name + " value changed");

  console.log(local.parameters.openingTimeMonday.get());

  if (value.name == "minutes") {
    var todayOpeningTime = "";
    // if yesterday's closing time was after midnight, it should happen today
    // so we might have 2 closing triggers in one day, one of them corresponding to yesterday
    // hence the list of closing times
    var todayClosingTimes = [];

    var timesObj = [
      {
        opening: local.parameters.openingTimeMonday.get(),
        closing: local.parameters.closingTimeMonday.get(),
      },
      {
        opening: local.parameters.openingTimeTuesday.get(),
        closing: local.parameters.closingTimeTuesday.get(),
      },
      {
        opening: local.parameters.openingTimeWednesday.get(),
        closing: local.parameters.closingTimeWednesday.get(),
      },
      {
        opening: local.parameters.openingTimeThursday.get(),
        closing: local.parameters.closingTimeThursday.get(),
      },
      {
        opening: local.parameters.openingTimeFriday.get(),
        closing: local.parameters.closingTimeFriday.get(),
      },
      {
        opening: local.parameters.openingTimeSatursday.get(),
        closing: local.parameters.closingTimeSatursday.get(),
      },
      {
        opening: local.parameters.openingTimeSunday.get(),
        closing: local.parameters.closingTimeSunday.get(),
      },
    ];

    todayNumber = local.values.weekDay.get() - 1;

    yesterdayNumber = todayNumber - 1;
    if (yesterdayNumber == -1) {
      //if today is monday, than yesterday was sunday
      yesterdayNumber = 6;
    }

    var todayOpeningTime = timesObj[todayNumber].opening;
    var todayClosingTime = timesObj[todayNumber].closing;
    if (isTimeGreater(todayClosingTime, todayOpeningTime)) {
      // if opening time is before closing time, closing should happen the same day
      todayClosingTimes.push(todayClosingTime);
    }
    var yesterdayOpeningTime = timesObj[yesterdayNumber].opening;
    var yesterdayClosingTime = timesObj[yesterdayNumber].closing;
    if (isTimeGreater(yesterdayOpeningTime, yesterdayClosingTime)) {
      // this means the user intended the closing time of yesterday to be after midnight
      // which means, today
      todayClosingTimes.push(yesterdayClosingTime);
    }

    currentHours = local.values.hour.get();
    currentMinutes = local.values.minutes.get();

    if (isTimeEqual(todayOpeningTime, currentHours, currentMinutes)) {
      script.log("Triggering the opening");
      local.values.openingTrigger.trigger();
      return;
    }
    for (var i = 0; i < todayClosingTimes.length; i++) {
      if (isTimeEqual(todayClosingTimes[i], currentHours, currentMinutes)) {
        script.log("Triggering the closing");
        local.values.closingTrigger.trigger();
        return;
      }
    }
  }
}

// utility functions

function isCharNumber(c) {
  return c >= "0" && c <= "9";
}

function checkAndCorrectTimeInput(timeString) {
  // Split the string by colon
  var parts = timeString.split(":");

  // Check if there are two parts (hours and minutes)
  if (parts.length != 2) {
    return "00:00";
  }

  // Parse hours and minutes
  // in JUCE, it returns 0 if not a number
  var hours = parseInt(parts[0], 10);
  var minutes = parseInt(parts[1], 10);

  hours = Math.round(hours);
  minutes = Math.round(minutes);

  //constrain hours to 0-23, minutes to 0-59
  if (hours < 0) {
    hours = 0;
  }
  if (hours > 23) {
    hours = 23;
  }
  if (minutes < 0) {
    minutes = 0;
  }
  if (minutes > 59) {
    minutes = 59;
  }

  return padNumberWithZeros(hours, 2) + ":" + padNumberWithZeros(minutes, 2);
}

function padNumberWithZeros(number, length) {
  numberLength = Math.max(1, Math.floor(Math.log10(number)) + 1);

  // Calculate the number of zeros needed
  var zerosToAdd = Math.max(0, length - numberLength);

  // Pad the string with zeros
  var paddedString = "";
  for (var i = 0; i < zerosToAdd; i++) {
    paddedString += "0";
  }
  paddedString += number;

  return paddedString;
}

function isTimeEqual(input1Time, input2Hour, input2Minutes) {
  // input1Time should be HH:MM
  // input2Hour and input2Minutes should be numbers

  var parts = input1Time.split(":");
  var input1Hour = parseInt(parts[0]);
  var input1Minutes = parseInt(parts[1]);

  return input1Hour == input2Hour && input1Minutes == input2Minutes;
}

function isTimeGreater(time1, time2) {
  // time1 should be a string of form HH:MM
  // time2 should be a string of form HH:MM
  // returns true if time1 > time2

  var parts1 = time1.split(":");
  var parts2 = time2.split(":");

  totalMinutes1 = parseInt(parts1[0]) * 60 + parseInt(parts1[1]);
  totalMinutes2 = parseInt(parts2[0]) * 60 + parseInt(parts2[1]);

  return totalMinutes1 > totalMinutes2;
}

module.exports={moduleValueChanged, test};