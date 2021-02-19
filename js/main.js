(function() {
  "use strict"
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
    let orderExpressions = DATA.orders_responds[path[0]];

    if (path.length > 1) {
      for (let i = 1; i < path.length; i++) {
        let expression = path[i];
        orderExpressions = orderExpressions[expression];
      }
    }

    if (typeof orderExpressions == "object") {
      for (let expressionName of Object.keys(orderExpressions)) {
        let match = order.match(new RegExp(expressionName));
        if (match) {
          let expression = orderExpressions[expressionName];
          if (typeof expression == "object") {
            let match = getMatch(order, expression) || getMatch(order, expressionName);
            if (match) {
              order = order.slice(match.index + match[0].length, order.length);
              path.push(expressionName);
              if (expressionName != match[0]) {
                path.push(match[0]);
              }
              return getOrderPath(expressionName, order, path);
            }
          }
        }
      }
    }

    return path;
  }

  function getMatch(txt, expressions) {
    if (typeof expressions == "object") {
      for (let expressionName of Object.keys(expressions)) {
        let match = txt.match(new RegExp(expressionName));
        return match;
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
        let cmd = txt.match(expression);
        if (cmd) {
          let order = txt.slice(cmd.index + cmd[0].length, txt.length);
          results[expressionName] = order;
        }
      }
    }
    return results;
  }

  function getOrdersResponds(orders) {
    let results = [];
    for (let orderName of Object.keys(orders)) {
      if (orders[orderName]) {
        let order = getOrderRespond(orderName, orders[orderName]);
        if (order) {
          results.push(order);
        }
      }
    }
    return results;
  }

  function getOrderRespond(orderName, order) {
    for (let order_respond_name of Object.keys(DATA.orders_responds[orderName])) {
      let match = order.match(new RegExp(order_respond_name));
      let order_responds;
      if (match) {
        let order_path = getOrderPath(orderName, order);
        if (order_path.length > 0) {
          order_responds = DATA.orders_responds[order_path[0]];
          for (let i = 1; i < order_path.length; i++) {
            let expression = order_path[i];
            order_responds = order_responds[expression];
          }
          return randomElementFromArray(order_responds);
        }
      }
    }
  }

  function evaluateOrdersResponds(ordersResponds) {
    for (let i = 0; i < ordersResponds.length; i++) {
      for (let commandName of Object.keys(DATA.commands)) {
        let command = DATA.commands[commandName];
        let match = ordersResponds[i].match(new RegExp(commandName));
        if (match) {
          let option = ordersResponds[i].slice(match.index + match[0].length, ordersResponds[i].lenght);
          let commandeDataName = DATA.commands[match[0]];
          let commandeData = DATA[commandeDataName];
          ordersResponds[i] = eval(commandeData[option])();
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
    displayFullAnswer(answers, orders_responds, question);
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

  function displayFullAnswer(answers, orders_responds, question) {
    let full_answer = '';

    if (orders_responds.length > 0) {
      full_answer = `${orders_responds.join(', ')}.`;
    } else if (answers.length > 0) {
      full_answer = `${answers.join(', ')}.`;
    }

    let question_elem = document.createElement('div');
    question_elem.classList.add('question', 'message');
    question_elem.innerHTML = question;
    document.querySelector('#conversation').appendChild(question_elem);

    if (full_answer.length > 0) {
      textToSpeech(full_answer);
      let full_answer_elem = document.createElement('div');
      full_answer_elem.classList.add('answer', 'message');
      full_answer_elem.innerHTML = full_answer;
      document.querySelector('#conversation').appendChild(full_answer_elem);
    } else {
      full_answer = "Sorry I didn't understand what do you mean";
      textToSpeech(full_answer);
      let full_answer_elem = document.createElement('div');
      full_answer_elem.classList.add('answer', 'message');
      full_answer_elem.innerHTML = full_answer;
      document.querySelector('#conversation').appendChild(full_answer_elem);
    }
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
            
    // This runs when the speech recognition service starts
    recognition.onstart = onstart;

    recognition.onend = onend;
              
    // This runs when the speech recognition service returns result
    recognition.onresult = onresult;
              
    // start recognition
   recognition.start();
 }

 async function run() {
    await fetch('data/data.json').then(dataLoaded);

    async function dataLoaded(data) {
      data = await data.json();
      DATA = data;
      setup();
    }

    function setup() {
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
  }

  window.addEventListener('load', run);
}())
