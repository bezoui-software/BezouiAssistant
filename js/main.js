(function() {
  "use strict"
  let DATA_URL = 'BezouiAssistant/data/data.json';
  let DATA = {};

  function getQuestions(txt) {
    let results = {};
    if (txt) {
      for (let expressionName of Object.keys(DATA.questions)) {
        let expression = new RegExp(DATA.questions[expressionName]);
        results[expressionName] = txt.match(expression);
      }
    }
    return results;
  }

  function getOrderPath(orderName, order, path = [orderName]) {
    let orderExpressions = getOrdersRespondsFromPath(path);

    if (isObject(orderExpressions)) {
      let match = getMatch(order, orderExpressions);
      if (match) {
        order = getOrderFromMatch(order, match);
        path.push(match[0]);
        path = getOrderPath(orderName, order, path);
      } 
    } else {
      let match = getMatch(order, orderName);
      if (match) {
        order = getOrderFromMatch(order, match);
        path.push(match[0]);
      } 
    }

    return path;
  }

  function getOrderFromMatch(order, match) {
    return order.slice(match.index  + match[0].length, order.length);
  }

  function isObject(a) {
    return typeof a == 'object';
  }

  function getMatch(txt, expressions) {
    if (typeof expressions == "object") {
      for (let expressionName of Object.keys(expressions)) {
        let match = txt.match(new RegExp(expressionName));
        if (match) {
          return match;
        }
      }
    } else {
      let match = txt.match(new RegExp(expressions));
      return match;
    }
  }

  function getOrders(txt) {
    let results = {};
    if (txt) {
      for (let expressionName of Object.keys(DATA.orders)) {
        let expression = new RegExp(DATA.orders[expressionName]);
        let match = txt.match(expression);
        if (match) {
          let order = getOrderFromMatch(txt, match);
          results[expressionName] = order;
        }
      }
    }
    return results;
  }

  function getOrdersResponds(orders) {
    let ordersResponds = [];
    for (let orderName of Object.keys(orders)) {
      let orderResponds = getOrderRespond(orderName, orders[orderName]);
      if (orderResponds) {
        ordersResponds.push(orderResponds);
      }
    }
    return ordersResponds;
  }

  function getOrderRespond(orderName, order) {
    let orderResponds;
    let match  = getMatch(orderName, DATA.orders_responds);
    if (match) {
      let orderPath = getOrderPath(match[0], order); 
      orderResponds =  getOrdersRespondsFromPath(orderPath);
    }
    let orderRespond = randomElementFromArray(orderResponds);
    return orderRespond;
  }

  function getOrdersRespondsFromPath(path) {
    let results;
    for (let expressionName of path) {
      if (results) {
        results = results[expressionName];
      } else {
        results = DATA.orders_responds[expressionName];     
      }
    }
    return results;
  }

  function evaluateOrdersResponds(ordersResponds) {
    for (let i=0; i<ordersResponds.length; i++) {
      for (let commandName of Object.keys(DATA.commands)) {
        let command = DATA.commands[commandName];
        let match = getMatch(ordersResponds[i], commandName);
        if (match) {
          let option = getOrderFromMatch(ordersResponds[i], match);
          let commandDataName = DATA.commands[match[0]];
          let commandData = DATA[commandDataName];
          ordersResponds[i] = eval(commandData[option])();
        }
      }
    }
    return ordersResponds;
  }

  function getAnswers(questions) {
    let results = [];
    for (let questionName of Object.keys(questions)) {
      if (questions[questionName]) {
        let answer = getAnswer(questionName);
        if (answer) {
          results.push(answer);
        }
      }
    }
    return results;
  }

  function getAnswer(questionName) {
    let results = DATA.answers[questionName];
    if (results) {
      return results[randomElementFromDict(results)];
    }
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  function randomElementFromDict(dict) {
    let keys = Object.keys(dict);
    let index = randomInt(0, keys.length);
    return keys[index];
  }

  function randomElementFromArray(arr) {
    let index = randomInt(0, arr.length);
    return arr[index];
  }

  function evaluateQuestion(question) {
    question = question.toLowerCase();
    let questions = getQuestions(question);
    let answers = getAnswers(questions);
    let orders = getOrders(question);
    let orders_responds = getOrdersResponds(orders);
    orders_responds = evaluateOrdersResponds(orders_responds);
    renderConversation(answers, orders_responds, question);
    return {answers, orders_responds};
  }

  function evaluateUserQuestion() {
    let user_question = document.querySelector('#user-question').value;
    if (user_question.length > 0) {
      clearInput();
      let result = evaluateQuestion(user_question);
      let {answers, orders_responds} = result;
    }
  }

  function evaluateUserVoiceQuestion() {
    function onstart() {
      document.querySelector('#send-voice-question-button').innerText = 'more_horiz';
    } 

    function onresult(event) {
      let question = event.results[0][0].transcript;
      evaluateQuestion(question);
      end();
    }

    function end() {
      document.querySelector('#send-voice-question-button').innerText = 'mic';
    }

    speechToText(onstart, onresult, end);
  }

  function renderConversation(answers, orders_responds, question) {
    let answer = '';

    if (orders_responds.length > 0) {
      answer = `${orders_responds.join(', ')}.`;
    } else if (answers.length > 0) {
      answer = `${answers.join(', ')}.`;
    } else {
      answer = "Sorry I didn't understand what do you mean";
    }

    textToSpeech(answer);
    renderQuestion(question);
    renderAnswer(answer);
  }

  function renderQuestion(question) {
    let question_elem = document.createElement('div');
    question_elem.classList.add('question', 'message');
    question_elem.innerHTML = question;
    document.querySelector('#conversation').appendChild(question_elem);
  }

  function renderAnswer(answer) {
    let answer_elem = document.createElement('div');
    answer_elem.classList.add('answer', 'message');
    answer_elem.innerHTML = answer;
    document.querySelector('#conversation').appendChild(answer_elem);
  }

  function clearInput() {
    document.querySelector('#user-question').value = '';
  }

  function textToSpeech(text) {
    var msg = new SpeechSynthesisUtterance();
    msg.text = text;
    window.speechSynthesis.speak(msg);
  }

  function speechToText(onstart, onresult, onend) {
    let SpeechRecognition = webkitSpeechRecognition;
    let recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
            
    recognition.onstart = onstart;
    recognition.onend = onend;
    recognition.onerror = onend;
    recognition.onresult = onresult;
              
   recognition.start();
 }

 async function run() {
    await fetch(DATA_URL).then(dataLoaded);

    async function dataLoaded(data) {
      DATA = await data.json();
      setup();
    }

    function setupEvents() {
      document.querySelector('#send-question-button').addEventListener('click', evaluateUserQuestion);
      document.querySelector('#send-voice-question-button').addEventListener('click', evaluateUserVoiceQuestion);
      window.addEventListener('keypress', e => {
        const { keyCode } = e;
      
        switch (keyCode) {
          case 13: 
            evaluateUserQuestion();
            break;
        }
      })
    }

    function setupServiceWorker() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('../sw.js').then(function(registration) {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function(err) {
          console.log('ServiceWorker registration failed: ', err);
        });
      }
    }

    function setup() {
      setupEvents();
      setupServiceWorker();
    }
  }

  window.addEventListener('load', run);
}())
