create table `users` (`email` varchar(30), `pwd` varchar(20), `phone` varchar(11) unique key, `name` varchar(10), `type` int(1) not null, primary key(email))default charset=utf8;

create table `family` (`index` int(10) not null auto_increment, `email` varchar(30), `inherence_number` int(8), `type` int(1) not null, primary key(`index`), foreign key (`email`) references users(`email`));

create table `good_tourist` (`index` int(10) not null auto_increment, `tourist_code` varchar(20), `email` varchar(30), `inherence_number` int(8), `present_day` datetime, primary key(`index`), foreign key (email) references users(email));

create table `tourist_score` (`index` int(10) not null auto_increment, `tourist_code` varchar(20), `avg_score` float(5), primary key(`index`));

create table `tourist_ranking` (`index` int(10) not null auto_increment, `tourist_code` varchar(20), `count` int(3), primary key(`index`));

create table `good_area` (`index` int(10) not null auto_increment, `area_code` varchar(20), `email` varchar(30), `inherence_number` int(8), `present_day` datetime, primary key(`index`), foreign key (email) references users(email));

create table `trip_plan` (`index` int(10) not null auto_increment, `inherence_number` int(8), `type` int(1) not null, `start_day` datetime, `end_day` datetime, `area_code` varchar(20), `email` varchar(30), `present_day` datetime, primary key(`index`), foreign key (email) references users(email));

create table `trip_schedule` (`index` int(10) not null auto_increment, `trip_plan_code` int(10), `day` int(3), `order` int(5), `touist` varchar(30), `pos_x` float(20), `pos_y` float(20), `memo` varchar(300), primary key(`index`), foreign key (trip_plan_code) references trip_plan(`index`));

create table `tourist_comment` (`index` int(10) not null auto_increment, `tourist_code` int(10), `email` varchar(30), `score` int(1), primary key(`index`), foreign key (email) references users(email));