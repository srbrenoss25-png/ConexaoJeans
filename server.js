import express from 'express'
const app= express();

app.get('/usuarios', (request,  res) => {
    res.send('Ok, Deu Certo')
})
app.listen(4000)
