
import sqlite from 'better-sqlite3'

const db = sqlite('storage.db')

for( const request of [
    `
        CREATE TABLE IF NOT EXISTS user (
            id integer PRIMARY KEY,
            username varchar(64) NOT NULL,
            password varchar(64) NOT NULL
        )
    `,
    `
        CREATE TABLE IF NOT EXISTS recette (
            id integer PRIMARY KEY,
            user_id integer NOT NULL,
            title varchar(128) NOT NULL,
            description varchar(2048) NOT NULL,
            image varchar(64),
            bakingtime integer NOT NULL,
            cookingtime integer NOT NULL
        )
    `,
    `
        CREATE TABLE IF NOT EXISTS note (
            id integer PRIMARY KEY,
            user_id integer NOT NULL,
            recette_id integer NOT NULL,
            note integer NOT NULL
        )
    `,
    `
        CREATE TABLE IF NOT EXISTS ingredient_name (
            id integer PRIMARY KEY,
            name varchar(128) NOT NULL
        )
    `,
    `
        CREATE TABLE IF NOT EXISTS ingredient (
            id integer PRIMARY KEY,
            name_id integer NOT NULL,
            recette_id integer NOT NULL
        )
    `,
    `
        CREATE TABLE IF NOT EXISTS step (
            id integer PRIMARY KEY,
            recette_id integer NOT NULL,
            content varchar(2048) NOT NULL,
            rank integer NOT NULL
        )
    `
]) db.prepare(request).run()

export default db