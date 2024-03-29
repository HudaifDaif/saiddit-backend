const {
	getArticles,
	getArticleById,
	patchArticleById,
	postArticle,
} = require("../controllers/article.controllers");
const {
	getCommentsById,
	postComment,
} = require("../controllers/comments.controllers");

const articlesRouter = require("express").Router();

articlesRouter.route("/").get(getArticles).post(postArticle);

articlesRouter
	.route("/:article_id/")
	.get(getArticleById)
	.patch(patchArticleById);

articlesRouter
	.route("/:article_id/comments")
	.get(getCommentsById)
	.post(postComment);

module.exports = articlesRouter;
