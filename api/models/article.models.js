const db = require("../../db/connection");
const format = require("pg-format");

exports.checkArticle = (article_id) => {
	return db
		.query(
			`
    SELECT * FROM articles
    WHERE article_id = $1
    ;`,
			[article_id]
		)
		.then(({ rows }) => {
			if (!rows.length) return Promise.reject({ status: 404 });
		});
};

exports.selectArticles = (id, topic, sort, order, limit, page) => {
	const body = id ? `articles.body,` : ``;
	const sortBy = sort ? `articles.${sort}` : `articles.created_at`;
	const limitClause = limit ? `LIMIT ${limit}` : `LIMIT 10`;
	const offsetClause = page
		? `OFFSET ${(limit || 10) * (page - 1)}`
		: `OFFSET 0`;

	if (/asc|desc/i.test(order)) {
		order = order.toUpperCase();
	} else if (order) return Promise.reject({ status: 400 });

	const orderBy = order === `ASC` ? `ASC` : `DESC`;

	const whereParams = [];

	id ? whereParams.push(`articles.article_id = ${id}`) : ``;
	topic ? whereParams.push(`topic = '${topic}'`) : ``;

	const whereClause = whereParams.length
		? `WHERE ${whereParams.join(" AND ")}`
		: ``;

	const formattedQuery = format(
		`
        SELECT title, articles.author, articles.article_id, topic,
        articles.created_at, articles.votes, article_img_url, %s
        COUNT(comments.comment_id) AS comment_count
        FROM articles
        LEFT OUTER JOIN comments
        ON articles.article_id = comments.article_id
		%s
        GROUP BY title, articles.author, articles.article_id
        ORDER BY %s %s
		%s
		%s
        ;`,
		body,
		whereClause,
		sortBy,
		orderBy,
		limitClause,
		offsetClause
	);

	return db.query(formattedQuery).then(async ({ rows }) => {
		if (!rows.length && !topic) return Promise.reject({ status: 404 });

		if (rows.length) {
			const userVotes = await db.query(`
			SELECT * FROM votes
			WHERE article_id = ${id} AND comment_id IS NULL
			;`);

			rows[0].userVotes = userVotes.rows;
		}

		return rows;
	});
};

exports.updateArticle = async (votes, id, username) => {
	const checkVote = await db.query(
		`
		SELECT * FROM votes
		WHERE username = $1
		AND article_id = $2
		AND comment_id IS NULL
		;`,
		[username, id]
	);

	const userVote = checkVote.rows[0];

	if (votes === -1 || votes === 0 || votes === 1) {
		if (userVote) {
			await db.query(
				`
				UPDATE votes
				SET vote_value = $1
				WHERE username = $2
				AND article_id = $3
				AND comment_id IS NULL
				RETURNING *
				;`,
				[votes, username, id]
			);
		} else {
			await db.query(
				`
				INSERT INTO votes
				(username, article_id, vote_value)
				VALUES
				($1, $2, $3)
				;`,
				[username, id, votes]
			);
		}

		const newVoteCount = await db.query(
			`
			SELECT votes.article_id, SUM(votes.vote_value) AS vote_count FROM votes
			WHERE article_id = $1
			AND comment_id IS NULL
			GROUP BY votes.article_id
			;`,
			[id]
		);
		const updatedVotes = newVoteCount.rows[0].vote_count;

		const { rows } = await db.query(
			`
			UPDATE articles
			SET votes = $1
			WHERE article_id = $2
			RETURNING *
			;`,
			[updatedVotes, id]
		);

		return !rows.length ? Promise.reject({ status: 404 }) : rows[0];
	} else {
		return Promise.reject({ status: 400 });
	}
};

exports.insertArticle = (author, title, body, topic, img_url) => {
	const articleColumn = img_url ? `, article_img_url` : ``;
	const article_img_url = img_url ? `, '${img_url}'` : ``;

	if (
		!author ||
		!title ||
		!body ||
		!topic ||
		typeof title !== "string" ||
		typeof body !== "string"
	) {
		return Promise.reject({ status: 400 });
	}

	const formattedQuery = format(
		`
		INSERT INTO articles 
		(author, title, body, topic %s)
		VALUES
		('%s', '%s', '%s', '%s' %s)
		RETURNING *
		;`,
		articleColumn,
		author,
		title,
		body,
		topic,
		article_img_url
	);

	return db.query(formattedQuery).then(({ rows }) => {
		rows[0].comment_count = 0;
		return rows[0];
	});
};

exports.getArticleCount = (limit, topic) => {
	const whereClause = topic ? `WHERE topic = '${topic}'` : ``;

	const formattedQuery = format(
		`
		SELECT count(*) FROM articles
		%s
		;`,
		whereClause
	);
	return db
		.query(formattedQuery)
		.then(({ rows }) => [rows[0].count, Math.ceil(rows[0].count / limit)]);
};
