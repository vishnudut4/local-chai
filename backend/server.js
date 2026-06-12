app.post('/api/order', async (req,res)=>{

try{

const {
vendor_id,
customer_name,
customer_mobile,
cups
} = req.body;

const result = await pool.query(
`INSERT INTO orders
(vendor_id,customer_name,customer_mobile,cups)
VALUES ($1,$2,$3,$4)
RETURNING *`,
[
vendor_id,
customer_name,
customer_mobile,
cups
]
);

res.json(result.rows[0]);

}catch(err){

res.status(500).json({
error:err.message
});

}

});
