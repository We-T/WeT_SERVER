var mysql         = require('mysql'),
    express       = require('express'),
    http          = require('http'),
    path          = require('path'),
    bodyParser    = require('body-parser'),
    fs            = require('fs'),
    dbconfig      = require('./config/database.js'),
    connection    = mysql.createConnection(dbconfig);
let request = require('request');
let cheerio = require('cheerio');

var app = express();

app.use(bodyPars.urlencoded({extended: false}));
app.get('/', (req, res) => {
    console.log(req.query);
    res.send({"result": "GET 호출"});
})

app.post(`/`, (req, res) => {
  console.log(req.body);
  res.send({"result": "POST 호출"});
})

app.put(`/:id`, (req, res) => {
  console.log(`내용 PrimaryKey : ${req.params.id}`)
  console.log(req.body);
  res.send({"result": "UPDATE 호출"});
})

app.delete(`/:id`, (req, res) => {
  console.log(req.params.id);
  console.log(req.path)
  res.send({"result": "DELETE 호출"});
})

app.listen(3000, '192.168.123.7', function () {
    console.log('서버 실행 중...');
});