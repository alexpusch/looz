$(document).ready(function() {
  function initCallendar(){
    var calendar =  $('#calendar').fullCalendar({
      header: {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek,agendaDay'
      },
      defaultDate: '2014-06-12',
      defaultView: 'agendaWeek',
      editable: true,
      height: 700
    });

    return calendar;
  }
  
  function initSchedual(){
    var schedualEl = $(".text-schedual textarea");

    schedualEl.on("keyup", function(e){
      localStorage.setItem("schedual", $(e.target).val());
    })

    var existingSchedual = localStorage.getItem("schedual");

    if(existingSchedual)
      schedualEl.val(existingSchedual);

    return schedualEl;
  }

  function update(schedualEl, calendar, startDate, repeatedEvents){
    var parsedEvents = parseTextSchedual(schedualEl.val());
    if(parsedEvents != undefined){
      console.log("updated")
      var newEvents = createFullCalanderEvents(startDate, hourRange, parsedEvents, repeatedEvents);

      calendar.fullCalendar("removeEventSource", myEvents);
      myEvents = newEvents;
      calendar.fullCalendar("addEventSource", myEvents);
    }
  }

  function createFullCalanderEvents(startDate, hoursRange, myEvents, repeatedEvents){
    startDate = moment(startDate);
    startDate.hours(hoursRange.start.hours)
    startDate.minutes(hoursRange.start.minutes)
    var currentDate = startDate;
    var events = [];

    todaysRepeatedEvents = createCalendarRepeatedEvents(repeatedEvents, currentDate);
    for(var j in todaysRepeatedEvents)
      events.push(todaysRepeatedEvents[j]);

    for(var i in myEvents){
      var event = myEvents[i];
      var newEventStart = currentDate, newEventEnd;
      var todaysRepeatedEvents;

      if( (newEventStart.hours() == hoursRange.end.hours && newEventStart.minutes() >= hoursRange.end.minutes) ||
        newEventStart.hours() > hoursRange.end.hours){
        newEventStart = shiftToNextDay(newEventStart, hoursRange);

        todaysRepeatedEvents = createCalendarRepeatedEvents(repeatedEvents, newEventStart);
        for(var j in todaysRepeatedEvents)
          events.push(todaysRepeatedEvents[j]);
      }

      newEventEnd = moment(newEventStart).add(event.duration, 'hours');

      var intersectingEvents = findIntersecting({start: newEventStart, end: newEventEnd}, todaysRepeatedEvents);
      if(intersectingEvents.length > 0){
        var currentEventPartStart = newEventStart
        // var currentEventLength = moment.duration(0);
        var eventLength = moment.duration(moment(newEventEnd).subtract(newEventStart));
        var remaningEventLength = moment.duration(eventLength);

        for(var j in intersectingEvents){ 
          var intersectingEvent = intersectingEvents[j];
          var currentEventPartEnd = intersectingEvent.start;
          var currentEventPartDuration = moment(currentEventPartEnd).subtract(currentEventPartStart);
          remaningEventLength.subtract(currentEventPartDuration);

          var currentEventPart =  {
            title: event.title,
            start: currentEventPartStart,
            end: currentEventPartEnd,
            className: getClassOfType(event.type)
          }
          events.push(currentEventPart);
          currentEventPartStart = intersectingEvent.end;
        }

        if(remaningEventLength.asSeconds() > 0){
          currentEventPartEnd = moment(currentEventPartStart).add(remaningEventLength);
          var lastEventPart = {
            title: event.title,
            start: currentEventPartStart,
            end: currentEventPartEnd,
            className: getClassOfType(event.type)
          }
          events.push(lastEventPart);
        }

        currentDate = currentEventPartEnd;
      }
      else{
        newEventEnd = moment(newEventStart).add(event.duration, 'hours');

        var newEvent = {
          title: event.title,
          start: newEventStart,
          end: newEventEnd,
          className: getClassOfType(event.type)
        }

        currentDate = newEventEnd;

        events.push(newEvent);
      }
    }


    return events;
  }

  function createCalendarRepeatedEvents(repeatedEvents, day){
    var repeatedEventsInstances = [];
    for(var j in repeatedEvents){
      var repeatedEvent = repeatedEvents[j];
      // if(isMomentRangeIntersect({start: newEventStart, end: newEventEnd}, {start: repeatedEvent.start, end: repeatedEvent.end)))

      var repeatedEventStart = moment(day);
      repeatedEventStart.hours(repeatedEvent.start.hours());
      repeatedEventStart.minutes(repeatedEvent.start.minutes());

      var repeatedEventEnd = moment(day);
      repeatedEventEnd.hours(repeatedEvent.end.hours());
      repeatedEventEnd.minutes(repeatedEvent.end.minutes());

      var newRepeatedEventInstance = {
        title: repeatedEvent.title,
        start: repeatedEventStart,
        end: repeatedEventEnd,
        className: getClassOfType(repeatedEvent.type)
      }

      repeatedEventsInstances.push(newRepeatedEventInstance);
    }

    return repeatedEventsInstances;
  }

  function isMomentRangeIntersect(range1, range2){
    // (range1.start.isBefore(range2.end) || range1.end.isAfter(range2.start) &&
    // (!(range1.start.isAfter(range2.start.end) && range.end.isBefore(range2.end)))

    return !(range1.end.isBefore(range2.start) || range1.start.isAfter(range2.end))
  }

  function shiftToNextDay(date, hoursRange){
    var result = moment(date);
    result.add(1, 'day');
    result.hours(hoursRange.start.hours);
    result.minutes(hoursRange.start.minutes);

    if(result.day() >= 5)
      result.add(7 - result.day(),'days')


    return result;
  }

  function findIntersecting(targetEvent, searchEvents){
    var intersectingEvents = [];
    for(var j in searchEvents){ 
      var testEvent = searchEvents[j];
      
      if(isMomentRangeIntersect(targetEvent, testEvent)){
        intersectingEvents.push(testEvent);
      }
    }

    return intersectingEvents;
  }

  function parseTextSchedual(text){
    var events = [];
    var lines = text.split("\n");
    for(lineIndex in lines){
      var line = lines[lineIndex];
      var parts = line.split("|");

      if(parts.length == 1 && parts[0] == "")
        continue;

      if(parts.length != 3)
        return;

      var type = parts[0]
      var title = parts[1];
      var duration = parseInt(parts[2], 10);

      events.push({
        title: title,
        duration: duration,
        type: type
      })
    }

    return events;
  }

  function getClassOfType(type){
    switch(type){
      case "L": 
        return "lecture";
      case "E":
        return "ex";
      case "P":
        return "project";
      case "R":
        return "recess";
    }
  }



  var myEvents = [];
  var calendar = initCallendar();
  var schedualEl = initSchedual();
  var hourRange = {
    start: {
      hours: 9,
      minutes: 0
    },
    end:{
      hours: 18,
      minutes: 0
    }
  }
  startDate = new Date(2014, 9, 19)
  calendar.fullCalendar('gotoDate', startDate);

  var repeatedEvents = [
    {
      title: "luanch",
      start: moment({hour: 13, minutes: 0}),
      end: moment({hour: 14, minutes: 0}),
      type: "R"
    }
  ]

  update(schedualEl, calendar, startDate, repeatedEvents);
  schedualEl.on("keyup", function(e){
    if(e.keyCode >= 37 && e.keyCode <= 40 || e.keyCode == 13) // arrow keys, enter
      return;
    update(schedualEl, calendar, startDate, repeatedEvents);
  })

  
});