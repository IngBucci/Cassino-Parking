const express = require('express');
const session = require('express-session'); //Assegnate al cliente un ID e lui effettua tutte le ulteriori richieste utilizzando quell'ID
const bodyParser = require('body-parser');  //per manipolare i dati provenienti dal client
const expbars = require('express-handlebars');
const mongoose = require('mongoose');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const methodOverride = require('method-override');


const upload = multer({
    dest: 'uploads/' // this saves your file into a directory called "uploads"
});

//  VARIABILI GLOBALI
const app = express();
const port = 3000;

let utente;
let test;

let postosbagliato;
let controllotarga;

let msg_successo = false;
let msg_errore = false;
let dis = "";

let dataSelezionata;
let targa;
let level;
let parkingspace;

let posti_totali = [];
let posti_occupati = [];
let posti_liberi = [];


//HANDLEBARS
app.engine('handlebars', expbars({
    defaultLayout: 'main',
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    },
}));
app.set('view engine', 'handlebars');
//---------------------------------

//MAIL TRANSPORTER
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'meetflyapp@gmail.com',
        pass: '30&Lodebnv',
    }
});
app.use(methodOverride("_method"));


app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

app.use(session({
    secret: "This is a secret string",
    name: 'uniqueSessionID',  //cookie name
    saveUninitialize: false
}));

//FOLDER FOR STATIC RESOURCES
app.use('/css', express.static(__dirname + '/assets/css'));
app.use('/img', express.static(__dirname + '/assets/img'));
app.use('/font', express.static(__dirname + '/assets/font-awesome-4.7.0'));
app.use('/qrcode', express.static(__dirname + '/assets/qrcode'));


//MONGOOSE CONNECTION
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/users', {
    useMongoClient: true,
})
    .then(() => console.log(' Server mongo connected'))
    .catch(err => console.log(err));


//SCHEMA AND MODEL
require('./models/users');
const User = mongoose.model('User');
const Reservation = mongoose.model('Reservation');



//ROUTE DELLE VARIE PAGINE

app.get('/', (req, res) => {
    dis = "disabled";
    res.render('login', {dis: dis});
    //res.sendFile('login.html', {root: path.join(__dirname, 'public')});
});
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
    });
    res.redirect("/");
});

app.get('/register', (req, res) => {
    dis = "disabled";
    res.render('register', {dis: dis});
});
app.post("/registrazione", bodyParser.urlencoded(), async (req, res) => {
    const email = req.body.email;
    const pswd = req.body.password;
    const cpswd = req.body.confirmpassword;

    var testo;
    dis = "disabled"

    test = await User.findOne({email: email});

    if (test != null) {
        testo = "ATTENZIONE: Email Già Utilizzata";
        console.log("Email già in uso");

        res.status(201).render('register', {
            testo: testo,
            msg_errore: true,
            dis: dis
        });
    } else {
        if (pswd === cpswd) {

            const addUser = new User({
                name: req.body.name,
                surname: req.body.surname,
                email: req.body.email,
                address: req.body.address,
                city: req.body.city,
                password: pswd
            })


            let mailOption = {
                from: 'meetflyapp@gmail.com',
                to: req.body.email,
                subject: 'Registrazione Cassino Parking',
                text: `Benvenuto ${utente.name} in Cassino Parking.\n Con noi potrai facilmente prenotare il tuo posto da casa.
                 \nGrazie dal Team CP.\n\nQuesta email è generata automaticamente. Non rispondere a questa email.`
            }
            await transporter.sendMail(mailOption, function (err, data) {
                if (err) {
                    console.log("Error occurs sending registration mail: " + err)
                    res.render('register');
                } else {
                    addUser.save();
                    console.log("Registration mail sent successfully!")

                    testo = "Registrazione avevnuta con successo";

                    res.status(201).render('login', {
                        testo: testo,
                        msg_successo: true,
                        dis: dis
                    });
                }
            })
        } else {
            testo = "Le Password non Corrispondono";
            res.status(201).render('register', {
                msg_errore: true,
                testo: testo
            });
        }
    }
});

app.get("/recuperaPassword", bodyParser.urlencoded(), (req, res) => {
    dis = "disabled"
    res.render('recuperaPassword', {dis: dis});
});
app.post("/randomPassword", bodyParser.urlencoded(), async (req, res) => {

    let email = req.body.email;

    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var string_length = 8;
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }

    var test2 = await User.findOne({email: email});

    if (test2 != null) {

        let mailOption = {
            from: 'meetflyapp@gmail.com',
            to: email,
            subject: 'Reset Password',
            text: 'La tua password temporanea è: ' + randomstring
        }
        await transporter.sendMail(mailOption, async function (err, data) {
            if (err) {
                console.log("Error occurs sending registration mail: " + err)
                res.render('recuperaPassword');
            } else {
                console.log("Registration mail sent successfully!");
                console.log(randomstring);

                User.updateOne({email: req.body.email}, {password: randomstring}, function (err, res) {
                    if (err) throw err;
                });

                msg_successo = true;
                console.log("db updated");
                res.status(201).render('login', {
                    testo: "Password resettata",
                    msg_successo: msg_successo,
                    email: email
                });
            }
        })
    } else {
        res.render('recuperapassword', {
            dis: dis,
            testo: "ATTENZIONE: Email errata. ",
            msg_errore: true,
            email: email
        });
    }
});


app.get("/backHome", bodyParser.urlencoded(), (req, res) => {

    let dis2 = "disabled";
    dis = "";

    if (req.session.loggedIn) {

        res.render('dashboard', {profile: utente.name, dis2: dis2, dis: dis});
    } else {
        dis = "disabled";
        res.redirect("/");
    }
});
app.post('/signIn', bodyParser.urlencoded(), async (req, res) => {

    const email = req.body.email;
    const pswd = req.body.password;

    utente = await User.findOne({email: email});   //per usare await bisogna usare async

    if (utente != null) {
        if (utente.password === pswd) {
            req.session.loggedIn = true;
            req.session.name = utente.email;

            res.status(201).render('dashboard', {profile: utente.name, dis2: "disabled"});
        } else {
            msg_errore = true;
            let testo = "Password Error";
            res.status(201).render('login', {msg_errore: msg_errore, testo: testo, dis: "disabled"});
        }
    } else {
        msg_errore = true;
        let testo = "Utente non Registrato! Registrati! "
        res.status(201).render('login', {msg_errore: msg_errore, testo: testo, dis: "disabled"});
    }
});

app.post("/verificaDisp", bodyParser.urlencoded(), async (req, res) => {

    posti_totali.splice(0, posti_totali.length);

    for (let i = 0; i < 20; i++) {
        posti_totali.push(i + 1);
    }

    dataSelezionata = req.body.data;
    level = req.body.level;

    let prenotazioni = await Reservation.find({data: dataSelezionata, level: level});
    let tot = await Reservation.find({data: dataSelezionata, level: level}).countDocuments();

    posti_liberi.splice(0, posti_liberi.length);
    posti_occupati.splice(0, posti_occupati.length);

    for (let i = 0; i < tot; i++) {
        posti_occupati.push(prenotazioni[i].parkingSpace);
    }

    var found;

    for (let i = 0; i < posti_totali.length; i++) {
        found = false;
        for (let j = 0; j < posti_occupati.length; j++) {
            if (posti_totali[i] == posti_occupati[j]) {
                found = true;
                break;
            }
        }
        if (!found) {
            posti_liberi.push(posti_totali[i])
        }
    }

    res.render('dashboard', {
        profile: utente.name,
        data: dataSelezionata,
        level: level,
        posti: posti_liberi,
    })
});

app.post("/prenotaPosto", bodyParser.urlencoded(), async (req, res) => {

    targa = req.body.targa;
    parkingspace = req.body.posto;

    controllotarga = Reservation.find({data: dataSelezionata, license: targa});
    let tot = await Reservation.find({data: dataSelezionata, license: targa}).countDocuments();

    if (tot != 0) {

        let testo = "targa già utilizzata per la data selezionata, cambiare targa o selezionare un altro giorno";

        res.status(201).render('dashboard', {
            profile: utente.name,
            testo: testo,
            msg_errore: true,
            dis2: "disabled"
        })
    } else {

        res.status(201).render('payment', {
            profile: utente.name,
            targauto: targa,
            piano: level,
            postoauto: parkingspace,
            date: dataSelezionata
        });
    }
});

app.post("/summary", bodyParser.urlencoded(), async (req, res) => {

    const addReservation = new Reservation({
        email: utente.email,
        license: targa,
        data: dataSelezionata,
        parkingSpace: parkingspace,
        level: level

    })
    addReservation.save();

    res.status(201).render('summary', {
        profile: utente.name,
        data: dataSelezionata,
        targa: targa,
        piano: level,
        ps: parkingspace
    });
});


app.get('/profile', (req, res) => {
    if (req.session.loggedIn) {

        res.status(201).render('profile', {
            profile: utente.name,
            cognome: utente.surname,
            email: utente.email,
            address: utente.address,
            city: utente.city,
            pass: utente.password
        });
    } else {
        res.redirect("/");
    }
});
app.post("/modificaDati", bodyParser.urlencoded(), async (req, res) => {

    var pswd = utente.password;
    var oldPswd = req.body.oldPswd;
    var newPswd = req.body.newPswd;


    var newvalues = {};

    var testo = "";

    msg_successo = false;
    msg_errore = false;

    if (newPswd === "" && (req.body.name != utente.name || req.body.lastname != utente.surname || req.body.email != utente.email
        || req.body.address != utente.address || req.body.city != utente.city)) {

        newvalues = {
            name: req.body.name,
            surname: req.body.lastname,
            address: req.body.address,
            city: req.body.city,
            email: req.body.email
        };

        console.log("Dati Changed")
        msg_successo = true;
        testo = "Dati Cambiati";

    } else if (newPswd === "" && req.body.name === utente.name && req.body.lastname === utente.surname
        && req.body.email === utente.email && req.body.address === utente.address && req.body.city === utente.city) {
        msg_successo = false;
        msg_errore = false;
    } else {
        if (oldPswd === pswd) {
            newvalues = {
                name: req.body.name,
                surname: req.body.lastname,
                address: req.body.address,
                city: req.body.city,
                email: req.body.email,
                password: req.body.newPswd
            };
            console.log("Password Changed");
            msg_successo = true;
            testo = "Password Cambiata";
        } else {
            msg_successo = false;
            msg_errore = true;
            testo = "ATTENZIONE! Per poter Cambiare la Password è necessario inserire anche la vecchia Password";
            console.log("Password errata")
        }
    }

    await User.updateOne({email: req.body.email}, newvalues);

    utente = await User.findOne({email: utente.email});

    res.status(201).render('profile', {
        profile: utente.name,
        cognome: utente.surname,
        email: utente.email,
        address: utente.address,
        city: utente.city,
        testo: testo,
        msg_successo: msg_successo,
        msg_errore: msg_errore
    });
});

app.get("/myReservations", bodyParser.urlencoded(), async (req, res) => {

    if (req.session.loggedIn) {
        Reservation.find({email: utente.email})
            .sort({data: 'desc'})
            .then(prenotazioni => {
                res.render('myReservations', {
                    profile: utente.name,
                    prenotazioni: prenotazioni
                });
            });
    } else {
        res.redirect("/");
    }
});
app.delete("/myReservations/:id", (req, res) => {

    console.log(req.params.id);
    Reservation.remove({
        _id: req.params.id
    }).then(pren => {
        res.redirect('/myReservations');
    });
});

app.get("/reportAbuse", bodyParser.urlencoded(), (req, res) => {
    if (req.session.loggedIn) {
        res.render('reportAbuse', {
            profile: utente.name,
        });
    } else {
        res.redirect("/");
    }

});
app.post('/uploadFile', upload.single('file-to-upload'), (req, res) => {
    fs.rename(__dirname + "\\" + req.file.path, __dirname + "\\" + req.file.destination + "\\" + req.file.originalname, () => {
        console.log("\nFile Renamed with: " + req.file.originalname + "!\n");
    });

    res.render('reportAbuse', {
        profile: utente.name,
        msg_successo: true,
        testo: "File Caricato con successo. Procedi completando la Segnalazione"
    });
});
app.post("/nuovoposto", bodyParser.urlencoded(), async (req, res) => {

    const data = req.body.data;
    const targa2 = req.body.targa2;

    postosbagliato = await Reservation.findOne({data: data, license: targa2});

    let email;

    if (postosbagliato != null) {

        let nuovoposto = postosbagliato.parkingSpace;
        let nuovolivello = postosbagliato.level;
        email = postosbagliato.email;

        res.render("nuovoposto", {
            profile: utente.name,
            nuovoposto: nuovoposto,
            nuovolivello: nuovolivello
        })
    } else {
        msg_errore = true;
        res.render('reportAbuse', {
            profile: utente.name,
            msg_errore: msg_errore,
            testo: "ATTENZIONE: Ricontrolla i dati inseriti"
        });
    }

    let mailOption = {
        from: 'meetflyapp@gmail.com',
        to: email,
        subject: 'CassinoParking AVVISO ',
        text: 'un utente ci ha segnalato che hai parcheggiato nel suo posto, ' +
            'nel rispetto delle norme della community ti invitiamo a porre più attenzione per le prossime volte.  ',
    }
    await transporter.sendMail(mailOption, function (err, data) {
        if (err) {
            console.log("Error occurs sending registration mail: " + err)
            res.render('dashboard');
        } else {
            res.status(201).render('nuovoposto', {
                testo: testo,
                msg_successo: msg_successo
            });
        }
    });
});

app.get('/map', (req, res) => {
    res.render('map', {profile: utente.name});
});