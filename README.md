# Bot Scripts

To install dependencies:

```bash
bun install
```

Create .env file from .env.example
Maybe ask Nexus lead for the env file

To run:

create file `data.csv` in the certificates folder

and generate JSON data using `generate-data.ts`

& images using `generate-image.ts` files

Update the ID & `message.ts` then broadcast using `sent-mail.ts` or `broadcast.ts`

```bash
bun run generate-data
```
```bash
bun run generate-image
```
```bash
bun run broadcast
```

```bash
bun run mail
```
