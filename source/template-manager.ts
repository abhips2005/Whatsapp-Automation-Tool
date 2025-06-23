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
  // Allow any non-empty string content, templates don't necessarily need variables
  return typeof content === 'string' && content.trim().length > 0;
}