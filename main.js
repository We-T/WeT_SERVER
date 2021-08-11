var mysql         = require('mysql'),
    express       = require('express'),
    http          = require('http'),
    path          = require('path'),
    bodyParser    = require('body-parser'),
    fs            = require('fs'),
    dbconfig      = require('./config/database.js'),
    connection    = mysql.createConnection(dbconfig),
    request       = require('request'),
    cheerio       = require('cheerio');

var app = express();

app.use(bodyPars.urlencoded({extended: false}));

// API
var url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
var serviceKey = 'p%2BX7gaUwAL7ZCk9tuQCKBphxgCJ4d7moeBFk1StHrffygC7NeEuW68ZuJe6Ph%2F5RBAqgcHxZ3pn%2F5PqoXJn9UA%3D%3D';
var inquiry = '';
queryParams = '?' + encodeURIComponent('ServiceKey') + '=' + serviceKey; // 이후에 += 로 계속 파라미터추가하기

app.post(`/login`, (req, res) => {
})

app.post('/join', function (req, res) {
    var type = req.body.type;
    var email = req.body.email;
    var pwd = req.body.pwd;
    var phone = req.body.phone;
    var name = req.body.name;
    

    // 삽입을 수행하는 sql문.
    var sql = 'INSERT INTO member_main (type, email, pwd, phone, name) VALUES (?, ?, ?, ?, ?)';
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

app.post(`/mypage`, (req, res) => {
})

app.listen(3000, '192.168.123.7', function () {
    console.log('서버 실행 중...');
});