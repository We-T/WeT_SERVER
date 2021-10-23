const mysql         = require('mysql'),
      express       = require('express'),
      http          = require('http'),
      path          = require('path'),
      bodyParser    = require('body-parser'),
      fs            = require('fs'),
      dbconfig      = require('./config/database.js'),
      connection    = mysql.createConnection(dbconfig),
      request       = require('request'),
      cheerio       = require('cheerio'),
      session       = require('express-session'),
      mysql_store   = require('express-mysql-session')(session),
      router        = express.Router(),
      urlencode     = require('urlencode');

const app = express();
let today = new Date(); 
let year = today.getFullYear(); // 년도
let month = today.getMonth() + 1;  // 월
let date = today.getDate();  // 날짜

//세션 미들웨어
var session_store = new mysql_store(dbconfig);
app.use(session({
    secret:"yj305",
    resave:false,
    saveUninitialized:true,
    store: session_store
}));

app.use(bodyParser.urlencoded({extended: true}));

// API
var kor_url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
var serviceKey = 'p%2BX7gaUwAL7ZCk9tuQCKBphxgCJ4d7moeBFk1StHrffygC7NeEuW68ZuJe6Ph%2F5RBAqgcHxZ3pn%2F5PqoXJn9UA%3D%3D';
var inquiry = '';
queryParams = '?' + encodeURIComponent('ServiceKey') + '=' + serviceKey; // 이후에 += 로 계속 파라미터추가하기

app.post('/join', function (req, res) {
    // join, family에 새 튜플 추가
    var type = req.body.type;
    var email = req.body.email;
    var pwd = req.body.pwd;
    var phone = req.body.phone;
    var name = req.body.name;
    

    // 삽입을 수행하는 sql문.
    var sql = 'insert into users (email, pwd, phone, name, type) VALUES (?, ?, ?, ?, ?)';
    var params = [email, pwd, phone, name, type];
    
    // sql 문의 ?는 두번째 매개변수로 넘겨진 params의 값으로 치환된다.
    connection.query(sql, params, function (err, result) {
        var resultCode = 404;
        var message = '에러가 발생했습니다';

        if (err) {
            console.log(err);
        } else {
            if(type == 1) {
                var sql2 = 'insert into family (email, inherence_number, type) VALUES (?, ?, ?)';
                var inherence_number = phone.substr(3,8); //번호 8자리
                var params2 = [email, inherence_number, type];
                connection.query(sql2, params2, function(err, result) {
                    console.log('자녀회원 family테이블에 입력 완료');
                });
                
            } else if (type == 2) {
                var sql2 = 'insert into family (email, inherence_number, type) VALUES (?, ?, ?)';
                var inherence_number = req.body.inherence_number; //번호 8자리 -> 부모면 입력값 받도록
                var params2 = [email, inherence_number, type];
                connection.query(sql2, params2, function(err, result) {
                    console.log('부모회원 family테이블에 입력 완료');
                });
            }
            resultCode = 200;
            message = '회원가입에 성공했습니다.';
            
        }

        res.json({
            'code': resultCode,
            'message': message
        });
    });
});

app.post('/login', function (req, res) {
    console.log(req.body.email);
    var email = req.body.email;
    var pwd = req.body.pwd;
    
    var sql = 'select * from users where email = ?';
    
    connection.query(sql, email, function(err, result) {
        var resultCode = 404;
        var message = '에러가 발생했습니다';
        
        if (err) {
            console.log(err);
        } else {
            if (result.length == 0) {
                resultCode = 204;
                message = '존재하지 않는 계정입니다!';
            } else if (pwd !== result[0].pwd) {
                resultCode = 204;
                message = '비밀번호가 틀렸습니다!';
            } else {
                //세션
                var sess = req.session;
                sess.email = email;
                sess.logined = true;
                
                resultCode = 200;
                message = '로그인 성공! ' + result[0].name + '님 환영합니다!';
                
                }
            }
        res.json({
            'code': resultCode,
            'message': message
        });
    });
});

app.post(`/mypage`, (req, res) => {
    var email = req.body.email;
    var sql_result;
    var send_result = {};
    var name;
    var type;
    var profile;
    var my_good = [];
    
    var sql = 'select * from users where email = ?';
    
    connection.query(sql, email, function(err, result) {        
        name = result[0].name;
        type = result[0].type;
    });
    
    /*
    var sql = 'select * from family where email = ?';
    
    connection.query(sql, email, function(err, result) {        
        inherence_number = result[0].inherence_number;
        var sql = 'select email from family where inherence_number = ? and email not in (?)';
        connection.query(sql, [inherence_number, email], function(err, result) {
            if(!err){
                for (var i =0; i <= result.length; i++) {
                    var sql2 =  'select name from user where email = ?';
                    send_result.i = result[i].name;
                }
                res.json(send_result); // json처리하나 result자체로 보내나 똑같은 json형식임
            } 
        });
    });
    */
    
    var sql2 = 'select tourist_code from good_tourist where email = ? order index desc';
    
    connection.query(sql2, email, function(err, result) {
        if(err){
            console.log(err);
        }else {
            
        }
    });
    for (let i = 0; i < sql_result.length; i++) {
        var queryParams = kor_url + 'detailCommon?ServiceKey=' + serviceKey + '&contentId='+sql_result[i].area_code+'&MobileOS=AND&MobileApp=WeT&firstImageYN=Y&defaultYN=Y&_type=json';
        request(queryParams, function(err, res, body) {
            send_result.i.title = body.items.item.title;
            send_result.i.addr1 = body.items.item.addr1;
            send_result.i.firstimage = body.items.item.firstimage;
        });
    }
    
    
    //res.send(send_result);
    
});

app.post('/mypage/add_family', function (req, res) {
    var email = req.body.email;
    var sql_result;
    var send_result = {};
    var inherence_number;
    var name;
    
    var sql = 'select * from family where email = ?';
    connection.query(sql, email, function(err, result1) { 
        inherence_number = result1[0].inherence_number;
        var sql2 = 'select email from family where inherence_number = ? and not email = ?';
        connection.query(sql2, [result1[0].inherence_number, email], function(err, result2) {
            if(!err){
                for (var i =0; i < result2.length; i++) {
                    var sql3 =  'select name from users where email = ?';
                    connection.query(sql3, result2[i].email, function(err, result) {
                        send_result.name = result[0].name;
                        res.json(send_result); // json처리하나 result자체로 보내나 똑같은 json형식임
                    });
                }
            } 
        });
    });
    /*
    connection.query(sql, email, function(err, result) {        
        inherence_number = result[0].inherence_number;
        var sql = 'select * from family where inherence_number = ? and email not in (?)';
        connection.query(sql, [inherence_number, email], function(err, result) {
            if(!err){
                res.json(result); // json처리하나 result자체로 보내나 똑같은 json형식임
            } else{
                console.log('Error while performing Query.', err);
            }
        });
    }); */
});

app.post('/mypage/add_family_number', function (req, res) { 
    console.log(req.body.email);
    var email = req.body.email;
    var sql = 'select inherence_number from family where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            console.log(result);
            res.send(result);
        }
    });
});

app.post('/mypage/my_good_list', function (req, res) {
    var email = req.body.email;
    var sql_result;
    var send_result = {};
    
    var sql = 'select area_code from good_area where email = ? order by present_day desc union select tourist_code as code from good_tourist where email = ? order by present_day desc';
    
    connection.query(sql, [email, email], function(err, result) {
        if(!err){
            sql_result = result;
        }
    });
    for (let i = 0; i < sql_result.length; i++) {
        var queryParams = kor_url + 'detailCommon?ServiceKey=' + serviceKey + '&contentId='+sql_result[i].area_code+'&MobileOS=AND&MobileApp=WeT&firstImageYN=Y&defaultYN=Y&_type=json';
        request(queryParams, function(err, res, body) {
            send_result.i.title = body.items.item.title;
            send_result.i.addr1 = body.items.item.addr1;
            send_result.i.firstimage = body.items.item.firstimage;
        });
    }
    res.send(send_result);
});

app.post('/mypage/parents_good_list', function (req, res) {//아직안함 가족버전
    var email = req.body.email;
    var inherence_number;
    var sql_result;
    var send_result = {};
    var sql = 'select * from family where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            inherence_number = result.inherence_number;
        }
    });
    
    var sql = 'select area_code from good_area where inherence_number = ? and not email = ? order by present_day desc union select tourist_code as code from good_tourist where inherence_number = ? and not email = ? order by present_day desc';
    
    connection.query(sql, [inherence_number, email, inherence_number, email], function(err, result) {
        if(!err) {
            sql_result = result;
        }
    });
    for (let i = 0; i < sql_result.length; i++) {
        var queryParams = kor_url + 'detailCommon?ServiceKey=' + serviceKey + '&contentId='+sql_result[i].area_code+'&MobileOS=AND&MobileApp=WeT&firstImageYN=Y&defaultYN=Y&_type=json';
        request(queryParams, function(err, res, body) {
            send_result.i.title = body.items.item.title;
            send_result.i.addr1 = body.items.item.addr1;
            send_result.i.firstimage = body.items.item.firstimage;
        });
    }
    res.send(send_result);
});

app.post('/mypage/trip_record', function (req, res) {
    var email = req.body.email;
    
    var sql = 'select * from trip_plan where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            res.json(result);
        }
    });
});

app.post('/main', function (req, res) {
    var email = req.body.email;
    var inherence_number;
    var sql = 'select * from family where email = ?';
    var result_json;
    
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            inherence_number = result.inherence_number;
        }
    });
    var sql = 'select * from family where inherence_number = ?';
    connection.query(sql, inherence_number, function(err, result) {    
        if(!err) {
            if (result.length >= 2){
                //부모님이 좋아요한 지역 반환
                var p_good_sql = 'select area_code from good_area where inherence_number = ? order by present_day desc';
                connection.query(sql, inherence_number, function(err, result) {
                    if(!err) {
                        result_json.p_good = result;
                    }
                });
            }
            //위트가 추천하는 관광지 반환
            var wet_good_sql = 'select tourist_code from (select tourist_code from good_tourist order by count(tourist_code) desc) group by tourist_code limit 10';
            connection.query(sql, function(err, result) {
                if(!err) {
                    result_json.wet_good = result;
                }
            });
                
            //tv속 여행지 -> 공통정보에서 랜던 5개
            var tv_sql = kor_url + 'detailCommon?ServiceKey=' + serviceKey + '&MobileOS=AND&MobileApp=WeT&firstImageYN=Y&defaultYN=Y&_type=json';
            request(tv_sql, function(err, res, body) {
                if (!err) {
                    result_json.tv_tour = result;
                }
            });
                
            //행사정보
            var queryParams = kor_url + 'searchFestival?ServiceKey=' + serviceKey + '&MobileOS=AND&MobileApp=WeT&arrange=O&eventStartDate=' + year+month+date + '&eventEndDate='+ year+month+'31' +'&_type=json'; //만약 오류나면 월에 상관없이 day가 31이라서 그런거임
            request(queryParams, function(err, resp, body) {
                if (!err) {
                    result_json.festival = body;
                }
                res.send(result_json);
            });   
        }
    });
    
});

/*
app.post('/search', function (req, res) {
    var queryParams = kor_url + 'areaCode?ServiceKey=' + serviceKey + '&numOfRows=100&MobileOS=AND&MobileApp=WeT&_type=json';
    request(queryParams, function(err, resp, body) {
        if(!err) {
            //지역은 사진이 없으므로 사진은 기본 이미지 넣어둔 채로 고정
            res.send(body);
        }
    });
});
*/

app.post('/search/keyword', function (req, res) {
    var keyword = urlencode.encode(req.body.keyword, "UTF-8");
    var queryParams = kor_url + 'searchKeyword?ServiceKey=' + serviceKey + '&keyword='+keyword+'&arrange=P&numOfRows=10&MobileOS=AND&MobileApp=WeT&_type=json';
    request(queryParams, function(err, resp, body) {
        if(!err) {
            //지역은 사진이 없으므로 사진은 기본 이미지 넣어둔 채로 고정
            console.log(body);
            res.send(body);
        }
    });
});

app.post('/area', function (req, res) {
    var email = req.body.email;
    var area_name = req.body.area_name;
    var inherence_number;
    var code;
    var result_json;
    
    var area_code_sql = 'select area_code from area_code where area_name = ?';
    connection.query(area_code_sql, area_name, function(err, result) {
        if(!err) {
            code = result[0].area_code;
        }
    });
    
    var sql = 'select inherence_number from family where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            inherence_number = result[0].inherence_number;
        }
    });
    
    // 여행계획에서 해당 지역 여행지가 있다면 출력 없으면 x
    var plan_sql = 'select trip_name, start_day, end_day where start_day >= ? order by index';
    connection.query(sql, year+month+date, function(err, result) {
        if(!err) {
            result_json.trip_plan = result;
        }
    });
    
    // 핫플레이스 => 좋아요한 관광지 중 지역코드로 검색하여 상위 10개 반환 반환
    var hot_place_sql = 'select tourist_code from (select tourist_code from good_tourist order by count(tourist_code) desc) where area code = ? group by tourist_code limit 10';
    connection.query(sql, code, function(err, result) {
        if(!err) {
            result_json.hot_place = result;
        }
    });
    
    // 나의 좋아요
    var my_good_sql = 'select tourist_code from tourist_good where area_code = ? and email = ? order by index;';
    connection.query(sql, [code, email], function(err, result) {
        if(!err) {
            result_json.my_good = result;
        }
    });
    
    // 부모님의 좋아요
    var my_good_sql = 'select tourist_code from tourist_good where area_code = ? and inherence_number = ? and not email = ? order by index;';
    connection.query(sql, [code, inherence_number, email], function(err, result) {
        if(!err) {
            result_json.p_good = result;
        }
        res.send(result_json);
    });
    
});

app.post('/area/category', function (req, res) {
    
});

app.post('/trip/save', function (req, res) {
    var email = req.body.email;
    var trip_name = req.body.trip_name;
    var start_day = req.body.start_day;
    var end_day = req.body.end_day;
    var area_name = req.body.area_name;
    var family = req.body.family; //배열
    var inherence_number;
    var type;
    var area_code;
    
    var sql = 'select inherence_number from family where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            inherence_number = result[0].inherence_number;
        }
    });
    var sql = 'select type from users where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            type = result[0].type;
        }
    });
    var sql = 'select area_code from family where area_name = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            inherence_number = result[0].inherence_number;
        }
    });
    
    
    var main_sql = 'insert into trip_plan (inherence_number, type, trip_name, start_day, end_day, area_code, email) value (?, ?, ?, ?, ?, ?, ?)';
    for (var i=0; i <= family.length; i++) {
        
    }
});

app.post('/trip/create', function (req, res) {
    var email = req.body.email;
    var sql_result;
    var send_result = {};
    var inherence_number;
    var name;
    
    var sql = 'select * from family where email = ?';
    connection.query(sql, email, function(err, result1) { 
        inherence_number = result1[0].inherence_number;
        var sql2 = 'select email from family where inherence_number = ? and not email = ?';
        connection.query(sql2, [result1[0].inherence_number, email], function(err, result2) {
            if(!err){
                for (var i =0; i < result2.length; i++) {
                    var sql3 =  'select name from users where email = ?';
                    connection.query(sql3, result2[i].email, function(err, result) {
                        send_result.name = result[0].name;
                        res.json(send_result); // json처리하나 result자체로 보내나 똑같은 json형식임
                    });
                }
            } 
        });
    });
});

app.post('/trip/select_area', function (req, res) {
    
});

app.post('/detail', function (req, res) {
    
});

app.post('/comment_add', function (req, res) {
    
});

app.post('/plan' , function (req, res) {
    
});

app.post('/plan/add', function (req, res) {
    
});

app.post('/plan/add/update', function (req, res) {
    
});

app.post('/plan/title_update', function (req, res) {
    
});

app.post('/plan/memo', function (req, res) {
    
});



app.listen(3000, '192.168.123.7', function () {
    console.log('서버 실행 중...');
});


