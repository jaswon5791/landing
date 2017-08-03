const h2c = String.fromCodePoint; // unicode hex -> character

function balloon (text) { // https://github.com/piuccio/cowsay
  if ("" == text) text = "moo"
  let lines = (function ( str, width ) { // https://j11y.io/snippets/wordwrap-for-javascript/
    if (!str) return str;
    var regex = String.raw`.{1,${width}}(\s|$)|.{${width}}|.+$`;
    return str.match( RegExp(regex, 'g') );
  })(text, 40).map(s => s.trim())
  let maxLength = lines.reduce((prev, cur) => (prev>cur.length)?prev:cur.length,0)
  let delims = {
    f: ["/","\\"],
    m: ["|","|"],
    l: ["\\","/"]
  }
  if (lines.length == 1) {
    return [
      " " + "_".repeat(maxLength + 2),
      "< " + lines[0] + " >",
      " " + "-".repeat(maxLength + 2)
    ].join("\n")
  } else {
    let balloon = [" " + "_".repeat(maxLength + 2)]
    for (var i = 0 ; i < lines.length ; ++i) {
      let delim = delims[i==0?"f":(i==lines.length-1?"l":"m")]
      balloon.push(delim[0]+" "+lines[i].padEnd(maxLength)+" "+delim[1])
    }
    return balloon.concat(" " + "-".repeat(maxLength + 2)).join("\n")
  }
}

function cowsay (text) {
  return String.raw`${balloon(text)}
    \   ^__^
     \  (oo)\_______
        (__)\       )\/\
            ||----w |
            ||     ||
  `
}

const rps = {
  rules: [
    [0,1,-1],
    [-1,0,1],
    [1,-1,0]
  ],
  moves: {
    'rock':0,
    'r':0,
    'paper':1,
    'p':1,
    'scissor':2,
    's':2
  },
  icons: [ '👊','🖐','✌️' ],
  faces: [ '😭','😐','😀' ]
}

function playRPS (pmove) {
  var cmove = Math.floor(Math.random()*3)
  var rules = rps.rules[cmove]
  var result = rules[rps.moves[pmove]]
  if (pmove in rps.moves)
    return `🤖${rps.icons[cmove]}${result>-1?"<":""}-${result<1?">":""}${rps.icons[rps.moves[pmove]]}${rps.faces[result+1]}`
  return "you have to play either r(ock), p(aper), or s(cissor)"
}

const getLocation = () => new Promise((res,rej) => {
  navigator.geolocation.getCurrentPosition(
    pos => res([pos.coords.latitude, pos.coords.longitude]),
    rej,
    { timeout: 3000, maximumAge: ten_min }
  )
});

const cors_proxy = 'https://cors-anywhere.herokuapp.com/'
const weather_api = `${cors_proxy}http://api.openweathermap.org/data/2.5/weather?appid=facace1962b06f4dc4e7d1b31ff1ab06`;
const geoip_api = `${cors_proxy}http://freegeoip.net/json/`
const dict_api = `${cors_proxy}http://www.onelook.com/`
const cors_headers = { headers: new Headers({ 'Origin':'https://jaswon.tech' }) }
const ten_min = 1000*60*10;
var lastRequested = Date.now();

(function() {
  const trigger = "'"

  const terminal = document.querySelector("#terminal")
  const lines = document.querySelector('#lines')
  const curLine = document.querySelector("#input")

  var terminalOpen = false;

  const history = []
  var historyPos = 0

  const aliases = (function(rev) {
    let ret = {}
    for (var key in rev)
      rev[key].forEach(function(v) {
        ret[v] = key
      })
    return ret
  })({
    'random': ['rand'],
    'hello': ['hi','hey'],
    'cowsay': ['moo'],
    'define': ['def']
  })

  const convertAlias = command => (command in aliases)?aliases[command]:command

  const links = ['reddit','facebook','youtube','github','gmail','messenger','amazon','massdrop'].reduce((a,x) => {
    a[x] = `http://${x}.com`
    return a
  }, {})
  links['blog'] = 'http://jaswon.tech'

  const commands = {
    'random': max => max?`${h2c(0x1F3B2)} ${Math.floor(Math.random()*max)}`:'gimme a numbah',
    'hello': () => `hi!${h2c(0x1F44B)}`,
    'echo': (...args) => args.join(" "),
    'cowsay': (...args) => cowsay(args.join(" ")),
    'cls': () => {
      curLine.innerHTML = ""
      while (lines.lastChild) lines.removeChild(lines.lastChild);
      return ""
    },
    'rps': playRPS,
    'help': () => (function(arr,perLine) { // grid formatted
      print("are you lost? 🤔",1)
      const maxLen = arr.reduce((p,c)=>p>c.length?p:c.length,0)
      return arr.reduce((a,x,i,s)=>(i%perLine)?a:a.concat([s.slice(i,i+perLine)]),[])
        .map(l=>l.reduce((a,x,i,s)=>a+x.padEnd(maxLen+5),""))
        .join("\n")
    })(Object.keys(commands),4),
    'weather': () => getLocation()
      .catch(err => {
        return fetch(geoip_api, cors_headers)
          .then(res => res.json())
          .then(res => [res.latitude, res.longitude])
      })
      .then(([lat,long]) => {
      return fetch(`${weather_api}&lat=${lat}&lon=${long}&units=metric`, cors_headers)
        .then(res => res.json())
        .then(res => `${res.name}: ${res.main.temp}˚C (${res.main.temp_min}˚C-${res.main.temp_max}˚C) w/ ${res.weather[0].description}`)
    }),
    'define': word => fetch(`${dict_api}?w=${word}&xml=1`, cors_headers)
      .then(r => r.text())
      .then(r => new DOMParser().parseFromString(r,'text/xml'))
      .then(r => Array.from(r.firstChild.children)
        .filter(e => e.localName == "OLQuickDef")
        .map(e => e.innerHTML.trim())
        .map(e => (e.indexOf('&') != -1)?e.slice(0,e.indexOf('&')):e )
        .join("\n")
      )
  }

  function display(content, res, before) {
    content != "" && content.split('\n').forEach(function(l) {
      var line = document.createElement("li")
      line.innerHTML = (res?"- ":"> ")+l
      if (before) lines.insertBefore(line,before)
      else lines.appendChild(line)
      terminal.scrollTop = terminal.scrollHeight
    })
  }

  var loadingSeq = '⠀⠁⠂⠄⡀⡈⡐⡠⣀⣁⣂⣄⣌⣔⣤⣥⣦⣮⣶⣷⣿⣿⢿⠿⡻⠻⢛⠛⠝⡙⠙⠩⢉⠉⠊⠌⡈⠈⠐⠠⢀'
  var step = 0

  function print(content, res) {
    if (!res) return display(content)
    var tmp = document.createElement("li")
    tmp.innerHTML = '-'
    var loading = setInterval(function() {
      tmp.innerHTML = `- ${loadingSeq[step++%loadingSeq.length]}`
    }, 100)
    lines.appendChild(tmp)
    terminal.scrollTop = terminal.scrollHeight
    Promise.resolve(content).then(v => {
      clearInterval(loading)
      display(v, true, tmp)
      tmp.remove()
    })
  }

  function evaluate(tokens) {
    return commands[tokens[0]].apply(null, tokens.slice(1))
  }

  function onTermKey (e) {
    if (e.keyCode == 38) { // up arrow
      if (historyPos >= history.length-1) curLine.innerHTML = history.length?history[history.length-1]:""
      else curLine.innerHTML = history[historyPos++]
    } else if (e.keyCode == 40) { // down arrow
      curLine.innerHTML = historyPos?history[--historyPos]:""
    } else if (e.keyCode == 13) { // enter
      historyPos = 0
      let command = curLine.innerHTML.trim()
      if ("" == command) return print(" ")
      history.unshift(command)
      let tokens = command.split(" ")
      tokens[0] = convertAlias(tokens[0])
      print(curLine.innerHTML);
      if (tokens[0] in links) window.location.href = links[tokens[0]]
      else if (tokens[0] in commands) print(evaluate(tokens), true)
      curLine.innerHTML = "";
      terminal.scrollTop = terminal.scrollHeight
    } else if (e.keyCode == 8) { // backspace
      if (e.ctrlKey || e.altKey) {
        curLine.innerHTML = curLine.innerHTML
          .trim()
          .split(" ")
          .slice(0,-1)
          .join(" ")
      } else {
        curLine.innerHTML = curLine.innerHTML.slice(0,-1)
      }
    } else if (e.key.length == 1) {
      if (!(e.key == trigger && (e.ctrlKey || e.metaKey) )) curLine.innerHTML += e.key
    }
    e.preventDefault()
  }

  document.querySelector("html").onkeydown = function(e) {
    if (e.key == trigger && (e.ctrlKey || e.metaKey) ) {
      terminalOpen = !terminalOpen
      terminal.className = ""
      terminal.className = terminalOpen?"show":"hide"
      if (terminalOpen) {
        terminal.focus()
        terminal.addEventListener("keydown",onTermKey)
      } else {
        terminal.removeEventListener("keydown",onTermKey)
      }
    }
  }

  if ('serviceWorker' in navigator) {
    console.log('CLIENT: service worker registration in progress.');
    navigator.serviceWorker.register('sw.js').then(function() {
      console.log('CLIENT: service worker registration complete.');
    }, function() {
      console.log('CLIENT: service worker registration failure.');
    });
  } else {
    console.log('CLIENT: service worker is not supported.');
  }
})()
