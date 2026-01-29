const aiService = require("../services/ai.service")


module.exports.getReview = async (req, res) => {

    try {
        const code = req.body?.code;

        if (!code || typeof code !== "string" || !code.trim()) {
            return res.status(400).json({ error: "Code is required" });
        }

        const response = await aiService(code);


        return res.json({ review: response });
    } catch (err) {
        console.error("getReview error:", err);
        return res.status(500).json({ error: "Failed to generate review" });
    }

}