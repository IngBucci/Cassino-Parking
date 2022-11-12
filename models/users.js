const mongoose = require('mongoose');

const usersSchema = mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    surname:{
        type: String,
        required: true
    },
    email:{
        type: String,
        require: true
    },
    password: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: false
    }
})

const reservationSchema = mongoose.Schema({
    email:{
        type: String,
        require: true
    },
    license:{
        type: String,
        require: true
    },
    data:{
        type: Date,
        require: true
    },
    parkingSpace:{
        type: String,
        require: true
    },
    level:{
        type: String,
        require: true
    }
})


mongoose.model('User' , usersSchema);
mongoose.model('Reservation' , reservationSchema);
