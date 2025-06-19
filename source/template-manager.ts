export type Template = {
  id: string;
  name: string;
  content: string;
  variables: string[];
};
export function extractVariables(templateText: string): string[] {
  const regex = /{{\s*([\w]+)\s*}}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(templateText)) !== null) {
    if (typeof match[1] === 'string') {
      variables.add(match[1]);
    }
  }
regex.lastIndex = 0;
  return Array.from(variables);
}
export function validateTemplateContent(content: string): boolean {
  return typeof content === 'string' && content.length > 0 && content.includes('{{');
}