const { DataTypes } = require('sequelize');
const db = require('../db');

const User = db.define('user', {
    email : {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate : {
            notEmpty : true,
            isEmail : true,
        }
    },

    username : {
        type: DataTypes.STRING,
        allowNull: false
    },

    githubId : {
        type: DataTypes.STRING,
        allowNull: false,
        validate : {
            notEmpty : true,
        }
    },

    reflash_token : {
        type: DataTypes.STRING,
        allowNull: false,
        validate : {
            notEmpty : true,
        }
    },

    access_token : {
        type: DataTypes.STRING,
        allowNull: false,
        validate : {
            notEmpty : true,
        }
    },

}, {
    timestamps : false
});

module.exports = User;