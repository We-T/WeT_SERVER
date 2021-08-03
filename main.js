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

app.post('/user/join', function (req, res) {
    var mem_type = req.body.mem_type;
    var id = req.body.id;
    var pwd = req.body.pwd;
    var phone = req.body.phone;
    var addr = req.body.addr;
    var name = req.body.name;
    

    // 삽입을 수행하는 sql문.
    var sql = 'INSERT INTO member_main (mem_type, id, pwd, phone, addr, name) VALUES (?, ?, ?, ?, ?, ?)';
    var params = [mem_type, id, pwd, phone, addr, name];
    
    // sql 문의 ?는 두번째 매개변수로 넘겨진 params의 값으로 치환된다.
    connection.query(sql, params, function (err, result) {
        var resultCode = 404;
        var message = '에러가 발생했습니다';

        if (err) {
            console.log(err);
        } else {
            resultCode = 200;
            message = '회원가입에 성공했습니다.';
        }

        res.json({
            'code': resultCode,
            'message': message
        });
    });
});

app.put(`/:id`, (req, res) => {
  console.log(`내용 PrimaryKey : ${req.params.id}`)
  console.log(req.body);
  res.send({"result": "UPDATE 호출"});
})

app.listen(3000, '192.168.123.7', function () {
    console.log('서버 실행 중...');
});