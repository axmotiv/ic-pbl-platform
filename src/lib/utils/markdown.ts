export function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-5 list-decimal">$2</li>')
    .replace(/^[-*]\s+(.+)$/gm, '<li class="ml-5 list-disc">$1</li>')
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    .replace(/<p><h([23])>/g, "<h$1>")
    .replace(/<\/h([23])><\/p>/g, "</h$1>")
    .replace(/<p><li/g, "<li")
    .replace(/<\/li><\/p>/g, "</li>")
    .replace(/<p><\/p>/g, "");
}
