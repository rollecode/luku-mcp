<center align="center" style="text-align: center;justify-content:center;">
<div align="center" style="text-align: center;justify-content:center;">
<h1 align="center" style="text-align: center;justify-content:center;">

Luku MCP server

<img style="justify-content:center;text-align: center;width: 95px; height: auto;" width="793" height="411" alt="Claude Code" src="https://github.com/user-attachments/assets/abed1a04-d69b-4ab4-a490-d606064df72d" />
<img style="justify-content:center;text-align: center;width: 150px; height: auto;" alt="Luku" src="assets/luku-logo.png" />

</h1>

![Version](https://img.shields.io/badge/version-1.0.0-a855f7.svg?style=for-the-badge) ![Node](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![OAuth](https://img.shields.io/badge/OAuth_2.1-EB5424?style=for-the-badge&logo=auth0&logoColor=white) ![MCP](https://img.shields.io/badge/MCP-000000?style=for-the-badge)

</div>
</center>

<hr>

Read and write your [Luku](https://luku.app) reading from Claude.ai and Claude Code. Everything the web app and the iOS app can do: the library and its shelves, the reading timer, sessions, progress, goals, bookmarks, statistics, book search and cover lookup, import and export.

<hr>

## How it fits together

```
Claude.ai ──────────── OAuth 2.1 ───────────┐
                                            v
Claude Code ── luku-mcp (stdio) ──┐     luku.app/mcp
Claude Code ── HTTP + token ──────┴──> luku.app/api/v1 ──> Supabase
```

Luku serves the MCP itself, so there is no second server to keep online and no connector password to invent: signing in is the Luku login you already have, with email, Google or Apple. `luku-mcp` is the stdio bridge for Claude Code. It holds no database access and no logic of its own; it asks Luku for the tool list and forwards each call, which is why the two can never drift apart.

## Connecting

### Claude.ai

Settings, Connectors, Add custom connector, and give it:

```
https://luku.app/mcp
```

Leave the client ID and secret empty. Claude.ai registers itself, sends you to Luku's own sign-in page, and shows you what it is asking for before anything is granted. Doing this once covers web, desktop and mobile, because connectors belong to your account rather than one device.

### Claude Code, through the browser

```bash
claude mcp add --transport http luku https://luku.app/mcp --scope user
```

Then run `/mcp` to sign in. Same login, same consent screen.

### Claude Code, with a token, no browser

Mint a personal access token in Luku under **Settings > API**, then:

```bash
claude mcp add --transport http luku https://luku.app/mcp \
  --header "Authorization: Bearer $LUKU_API_TOKEN" --scope user
```

### Claude Code, over stdio

```bash
git clone git@github.com:rollecode/luku-mcp.git
cd luku-mcp
npm install && npm run build

claude mcp add luku --env LUKU_API_TOKEN=luku_pat_... -- node /path/to/luku-mcp/dist/index.js
```

## Tools

Read tools work with any token. Write tools need a read-write token and are refused otherwise, so a token minted for questions cannot log reading.

### Reading

| Tool | What you get |
| --- | --- |
| `luku_me` | Who the connection belongs to, their settings, and how many books sit on each shelf |
| `luku_library` | A shelf, or the whole library, optionally searched by title or author |
| `luku_book` | One book in full, with its sessions and bookmarks |
| `luku_now` | The running or paused session, how long it has run, and what is being read |
| `luku_sessions` | Reading sessions, newest first, by book or date range |
| `luku_stats` | Minutes and pages today, this week, this month and this year, books finished, goals in force |
| `luku_monthly_stats` | One month day by day |
| `luku_goals` | Yearly book goal and daily minutes goal, per year |
| `luku_bookmarks` | Saved links, for one book or all of them |
| `luku_search_books` | Search Goodreads, Google Books, BookBeat and Open Library |
| `luku_book_info` | Description, page count, publisher, ISBNs and cover for a book not in the library |
| `luku_find_covers` | Cover candidates from every source the app searches |
| `luku_author_books` | Other books by the same author |
| `luku_recommendations` | Recommendations already generated in the app |
| `luku_export` | The whole library as JSON or markdown |
| `luku_changelog` | Published changelog entries |
| `luku_roadmap` | Planned features and their votes |

### Writing

| Tool | What it does |
| --- | --- |
| `luku_add_book` | Add a book. Only the title is required; the rest is looked up |
| `luku_update_book` | Edit metadata, rating or notes |
| `luku_set_status` | Move a book to reading, next-up, to-read, finished or abandoned |
| `luku_set_progress` | Set the position: page, percent or seconds listened |
| `luku_delete_book` | Remove a book and its sessions |
| `luku_start_timer` | Start a reading session |
| `luku_pause_timer` | Pause it, so the break is not counted as reading |
| `luku_resume_timer` | Resume it |
| `luku_stop_timer` | End it and carry the end position onto the book |
| `luku_log_session` | Record reading that already happened |
| `luku_edit_session` | Correct a session's times or pages |
| `luku_delete_session` | Delete a session, giving back the progress it accounted for |
| `luku_set_goal` | Set the yearly book goal or the daily minutes goal |
| `luku_add_bookmark` | Save a link to a book |
| `luku_update_bookmark` | Edit a saved link |
| `luku_delete_bookmark` | Remove a saved link |
| `luku_set_settings` | Theme, default tracking method, recommendations on or off |
| `luku_import_books` | Import a Bookshelf CSV export, or a list of books |
| `luku_vote_roadmap` | Vote for a feature, or take the vote back |

## Progress, in three units

A book is tracked in pages, in percent, or in seconds for an audiobook, and the unit decides which argument to pass:

```json
{"bookId": "...", "page": 214}
{"bookId": "...", "percent": 62}
{"bookId": "...", "seconds": 18450}
```

The percentage is derived from whichever one is given, a book still on the to-read shelf starts being read, and the start date is stamped the first time progress appears. That matches the app exactly, so a book moved along from Claude looks no different from one moved along by hand.

Stopping the timer carries the end position onto the book in the same step:

```json
{"sessionId": "...", "endPage": 240}
```

Deleting a finished session takes that ground back, rebuilding the position from the sessions that remain, so a mistaken entry does not leave the book claiming progress nothing accounts for.

## Settings

| Variable | What it is for |
| --- | --- |
| `LUKU_API_URL` | Where Luku lives. `https://luku.app` unless you self-host |
| `LUKU_API_TOKEN` | A personal access token from Settings > API |

The token is the whole key to one account's reading, so treat it as a password: keep it out of shell history and out of the repository.

## Self-hosting Luku

Luku is self-hostable, and a self-hosted instance serves its own MCP at `/mcp` with its own OAuth. Point `LUKU_API_URL` at it, or hand Claude.ai `https://your-host/mcp`. See [the Luku repository](https://github.com/rollecode/luku) for the setup, and [api.luku.app](https://api.luku.app) for the API reference.

## Working on the code

```bash
npm install
npm run build
LUKU_API_TOKEN=luku_pat_... node dist/index.js
```

`dist/` is committed, so rebuild only when `src/` changes.
