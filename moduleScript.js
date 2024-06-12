// function init() {
//   script.log("Custom module init");
// }

function moduleParameterChanged(param) {
  script.log(param.name + " parameter changed");

  if (param.isParameter()) {
    if (
      param.name !== "day" &&
      param.name !== "month" &&
      param.name !== "year"
    ) {
      correctedInput = checkAndCorrectTimeInput(param.get());
      param.set(correctedInput);
    }
  } else {
    if (param.name == "addException") {
      var exceptionsContainer = local.parameters.getChild("Exceptions");
      var listChildren = util.getObjectProperties(
        exceptionsContainer,
        true,
        false
      );
      var numberOfExceptions = listChildren.length - 2;
      var exc = exceptionsContainer.addContainer(
        "Exception" + (numberOfExceptions + 1)
      );
      exc.addIntParameter("Day", "Day of the month", 1, 1, 31);
      exc.addIntParameter("Month", "from 1 to 12", 1, 1, 12);
      exc.addIntParameter("Year", "4 digits, e.g. 2024", 1970);
      exc.addStringParameter("Opening Time", "HH:MM", "09:00");
      exc.addStringParameter("Closing Time", "HH:MM", "22:00");
    } else if (param.name == "clearExceptions") {
      var exceptionsContainer = local.parameters.getChild("Exceptions");
      var listChildren = util.getObjectProperties(
        exceptionsContainer,
        true,
        false
      );
      for (var i = 0; i < listChildren.length; i++) {
        var name = listChildren[i];
        if (name !== "addException" && name !== "clearExceptions") {
          exceptionsContainer.removeContainer(name);
        }
      }
    }
  }
}

function moduleValueChanged(value) {
  // script.log(value.name + " value changed");

  if (value.name == "minutes") {
    var todayOpeningTime = "";
    // if yesterday's closing time was after midnight, it should happen today
    // so we might have 2 closing triggers in one day, one of them corresponding to yesterday
    // hence the list of closing times
    var todayClosingTimes = [];

    var exceptionOpeningTime;
    var exceptionClosingTime;
    var yesterdayExceptionOpeningTime;
    var yesterdayExceptionClosingTime;

    //check exceptions
    var dayInMonth = local.values.monthDay.get();
    var month = local.values.month.get();
    var year = local.values.year.get();
    var yesterday = getYesterday(dayInMonth, month, year);
    var exceptionsContainer = local.parameters.getChild("Exceptions");
    var listChildren = util.getObjectProperties(
      exceptionsContainer,
      true,
      false
    );
    for (var i = 0; i < listChildren.length; i++) {
      var name = listChildren[i];
      if (name !== "addException" && name !== "clearExceptions") {
        var exception = exceptionsContainer.getChild(name);
        if (typeof exception !== "void") {
          script.log(exception.closingTime.get());
          if (
            exception.year.get() == year &&
            exception.month.get() == month &&
            exception.day.get() == dayInMonth
          ) {
            exceptionOpeningTime = exception.openingTime.get();
            exceptionClosingTime = exception.closingTime.get();
            script.log(
              "exception found " +
                exceptionOpeningTime +
                " " +
                exceptionClosingTime
            );
          }
          if (
            exception.year.get() == yesterday[2] &&
            exception.month.get() == yesterday[1] &&
            exception.day.get() == yesterday[0]
          ) {
            // there was an exception yesterday
            yesterdayExceptionOpeningTime = exception.openingTime.get();
            yesterdayExceptionClosingTime = exception.closingTime.get();
          }
        }
      }
    }

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

    var todayOpeningTime;
    var todayClosingTime;

    if (typeof exceptionOpeningTime !== "undefined"){
      // means today is an exception
      todayOpeningTime = exceptionOpeningTime;
      todayClosingTime = exceptionClosingTime;
    } else {
      todayOpeningTime = timesObj[todayNumber].opening;
      todayClosingTime = timesObj[todayNumber].closing;
    }
    if (isTimeGreater(todayClosingTime, todayOpeningTime)) {
      // if opening time is before closing time, closing should happen the same day
      todayClosingTimes.push(todayClosingTime);
    }

    var yesterdayOpeningTime;
    var yesterdayClosingTime;

    if (typeof yesterdayExceptionOpeningTime !== "undefined"){
      yesterdayOpeningTime = yesterdayExceptionOpeningTime;
      yesterdayClosingTime = yesterdayExceptionClosingTime;
    } else {
      yesterdayOpeningTime = timesObj[yesterdayNumber].opening;
      yesterdayClosingTime = timesObj[yesterdayNumber].closing;
  
    }
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
  var hours = Math.round(parts[0]);
  var minutes = Math.round(parts[1]);

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
  var input1Hour = Math.round(parts[0]);
  var input1Minutes = Math.round(parts[1]);

  return input1Hour == input2Hour && input1Minutes == input2Minutes;
}

function isTimeGreater(time1, time2) {
  // time1 should be a string of form HH:MM
  // time2 should be a string of form HH:MM
  // returns true if time1 > time2

  var parts1 = time1.split(":");
  var parts2 = time2.split(":");

  totalMinutes1 = Math.round(parts1[0]) * 60 + Math.round(parts1[1]);
  totalMinutes2 = Math.round(parts2[0]) * 60 + Math.round(parts2[1]);

  return totalMinutes1 > totalMinutes2;
}

function getYesterday(dayMonth, month, year) {
  // dayMonth, month and year are integers
  if (dayMonth !== 1) {
    return [dayMonth - 1, month, year];
  } else {
    // means today is 1st of month, so yesterday was previous month
    var newMonth = month - 1;
    var newYear = year;
    var newDayMonth = 0;
    if (newMonth == 0) {
      //means it is 1st of january
      newMonth = 12; 
      newYear = year - 1;
    }
    if (newMonth == 2) {
      newDayMonth = 28;
    } else if (
      newMonth == 1 ||
      newMonth == 3 ||
      newMonth == 5 ||
      newMonth == 7 ||
      newMonth == 8 ||
      newMonth == 10 ||
      newMonth == 12
    ) {
      newDayMonth = 31;
    } else {
      newDayMonth = 30;
    }
    return [newDayMonth, newMonth, newYear];
  }
}
