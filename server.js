import express from 'express'

const app= express();


const users = []

app.post('/usuarios', (req, res,) => {

console.log(req)

res.send('Ok, aqui deu certo')

})

app.get('/usuarios', (request,  res) => {
    res.send('Ok, Deu Certo')
})
app.listen(4000)
