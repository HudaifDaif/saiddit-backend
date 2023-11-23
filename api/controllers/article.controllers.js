const {
	selectArticleById,
	selectArticles,
	updateArticle,
} = require("../models/article.models");
const { checkTopic } = require("../models/topics.models");

exports.getArticleById = (req, res, next) => {
	id = req.params.article_id;

	selectArticleById(id)
		.then((rows) => {
			if (!rows.length) {
				return Promise.reject({ status: 404 });
			}
			res.status(200).send({ article: rows[0] });
		})
		.catch(next);
};

exports.getArticles = (req, res, next) => {
	const topic = req.query.topic;

	const promises = [selectArticles(topic)];

	topic && promises.push(checkTopic(topic));

	Promise.all(promises)
		.then((resolved) => {
			const rows = resolved[0];
			res.status(200).send({ articles: rows });
		})
		.catch(next);
};

exports.patchArticleById = (req, res, next) => {
	const id = req.params.article_id;
	const votes = req.body.inc_votes;

	updateArticle(votes, id)
		.then((article) => {
			res.status(200).send({ article });
		})
		.catch(next);
};
