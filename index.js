
import express from 'express'
import bodyParser from 'body-parser'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import db from './database'
import config from './config.json'

const api = express()

api.disable('x-powered-by')

api.use(
    helmet(),
    bodyParser.json(),
    bodyParser.urlencoded({ extended: true }),
    ( req, res, next ) => {
        res.setHeader("Access-Control-Allow-Origin", "*")
        res.setHeader("Access-Control-Allow-Header", "Content-Type")
        next()
    }
)

api.post( '/login', async ( req, res ) => {
    const user = {
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, 10)
    }
    let dbUser = db.prepare('SELECT * FROM user WHERE username=?').get(user.username)
    if(!dbUser){
        db.prepare('INSERT INTO user (username,password) VALUES (?,?)').run(user.username,user.password)
        dbUser = db.prepare('SELECT id FROM user WHERE username=?').get(user.username)
    }else {
        if(dbUser.password !== user.password) 
        return res.status(403).json({error: 'Password is invalid'})
    }
    user.id = dbUser.id
    const token = newToken(user)
    res.status(200).json({ token })
})

api.post( '/recette', needToken, async ( req, res ) => {
    if(!req.body.json) 
    return res.status(403).json({error: 'Missing data'})
    try{

        const data = JSON.parse(req.body.json)
        db.prepare(`
            INSERT INTO recette (
                user_id,
                title,
                description,
                image,
                bakingtime,
                cookingtime
            ) VALUES (?,?,?,?,?,?)
        `).run(
            req.user.id,
            data.title,
            data.description,
            data.image,
            data.bakingtime,
            data.cookingtime
        )
        const recette = db.prepare('SELECT id FROM recette WHERE user_id=? AND title=?').get(req.user.id,data.title)
        data.steps.forEach( (step,rank) => {
            db.prepare(`
                INSERT INTO step (
                    recette_id,
                    content,
                    rank
                ) VALUES (?,?,?)
            `).run(recette.id,step,rank)
        })
        data.ingredients.forEach( ingredient => {
            let iname = db.prepare('SELECT * FROM ingredient_name WHERE name=?').get(ingredient)
            if(!iname){
                db.prepare('INSERT INTO ingredient_name (name) VALUES (?)').run(ingredient)
                iname = db.prepare('SELECT * FROM ingredient_name WHERE name=?').get(ingredient)
            }
            db.prepare(`INSERT INTO ingredient (name_id, recette_id) VALUES (?,?)`).run(iname.id,recette.id)
        })
    }catch(error){
        res.status(500).json({ error })
    }
    res.sendStatus(200)
})

api.get( '/profile', needToken, async ( req, res ) => {
    res.status(200).json({username: req.user.username})
})

api.get( '/recettes', needToken, async ( req, res ) => {
    let recettes = db.prepare('SELECT * FROM recette WHERE user_id=?').all(req.user.id)
    recettes = recettes.map( recette => {
        recette.ingredients = db.prepare(`
            SELECT iname.name AS name
            FROM ingredient i
            LEFT JOIN ingredient_name iname
            ON iname.id = i.name_id
            WHERE i.recette_id = ?
        `).all(recette.id).map( ingredient => ingredient.name )
        recette.steps = db.prepare('SELECT * FROM step WHERE recette_id=?').all(recette.id)
            .sort( (a,b) => a.rank - b.rank )
            .map( step => step.content )
        return recette
    })
    res.status(200).json(recettes)
})

api.listen(2834)

function needToken( req, res, next ){
    const header = req.headers['authorization']
    const token = header && header.split(/\s+/)[1]
    if(!token) return res.status(401).json({error: 'Access yoken is needed'})
    jwt.verify( token, config.secret, (error, user) => {
        if(error) return res.status(403).json({error: 'Access yoken is invalid'})
        req.user = user
        next()
    })
}

function newToken( user ){
    return jwt.sign( user, config.secret, {expiresIn: '1h'} )
}