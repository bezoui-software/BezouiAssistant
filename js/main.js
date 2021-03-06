(function() {
  "use strict"
  let DATA_URL = 'data/data.json';
  let DATA = {};
  let TEXT_TO_SPEECH_VOICE;
  let ERRORS = {
    "NO_ANSWER": "Sorry, I didn't understand what do you mean !",
    "CONTAIN_BAD_WORDS": "Your question contain some bad words, I can't answer it !"
  };

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
    let orderResponds, orderPath;
    let match  = getMatch(orderName, DATA.orders_responds);
    if (match) {
      orderPath = getOrderPath(match[0], order); 
      orderResponds =  getOrdersRespondsFromPath(orderPath);
    }
    let orderRespond = randomElementFromArray(orderResponds);
    if (orderRespond) {
      return {respond: orderRespond, match, path: orderPath};
    }
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
    if (!ordersResponds) return;

    for (let i=0; i<ordersResponds.length; i++) {
      for (let commandName of Object.keys(DATA.commands)) {
        let command = DATA.commands[commandName];
        let match = getMatch(ordersResponds[i].respond, commandName);
        if (match) {
          let option = getOrderFromMatch(ordersResponds[i].respond, match);
          let commandDataName = DATA.commands[match[0]];
          let commandData = DATA[commandDataName];
          ordersResponds[i].respond = eval(commandData[option])();
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

    let answers = [], orders_responds = [];
    if (!isConatainBadWords(question)) {
      let questions = getQuestions(question);
      let orders = getOrders(question);
      answers = getAnswers(questions);
      orders_responds = getOrdersResponds(orders);
      orders_responds = evaluateOrdersResponds(orders_responds);
    } else {
      answers.push(ERRORS.CONTAIN_BAD_WORDS);
    }

    renderConversation(answers, orders_responds, question);
    return {answers, orders_responds};
  }
 
  function isConatainBadWords(txt) {
    let badWordsRegExp = new RegExp(DATA.bad_words);
    let match = txt.match(badWordsRegExp); 
    return match;
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

  function renderConversation(answers, ordersResponds, question) {
    if (ordersResponds.length > 0) {
      answers = []; 
      for (let orderRespond of ordersResponds) {
        answers.push(orderRespond.respond);   
      }     
    } else if (answers.length == 0) {
      answers.push(ERRORS.NO_ANSWER);
    }

    renderQuestion(question);     
    renderAnswers(answers);
  }

  function renderQuestion(question) {
    let question_elem = document.createElement('div');
    question_elem.classList.add('question', 'message');
    question_elem.innerHTML = question;
    document.querySelector('#conversation').appendChild(question_elem);
  }

  function renderAnswers(answers) {
    for (let answer of answers) {
      textToSpeech(answer);
      renderAnswer(answer);        
    }
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
    let msg = new SpeechSynthesisUtterance();
    msg.text = text;
    msg.lang = 'eng-US';
    msg.pitch = 1;
    msg.volume = 1;
    msg.rate = 1;
    if (TEXT_TO_SPEECH_VOICE) {
      msg.voice = TEXT_TO_SPEECH_VOICE;
    }
    window.speechSynthesis.speak(msg);
  }

  function updateTextToSpeechVoice() {
    let textToSpeechVoices = speechSynthesis.getVoices();
    TEXT_TO_SPEECH_VOICE = textToSpeechVoices[3];
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
      const keyPressEvents = {13: evaluateUserQuestion}
      document.querySelector('#send-question-button').addEventListener('click', evaluateUserQuestion);
      document.querySelector('#send-voice-question-button').addEventListener('click', evaluateUserVoiceQuestion);
      window.addEventListener('keypress', e => {
        const { keyCode } = e;
        const func = keyPressEvents[keyCode];
        if (func) {
          func();
        }
      })
      speechSynthesis.onvoiceschanged = updateTextToSpeechVoice;
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
