export default function MediaList({ items, onReorder }) {
  // Реализация списка с возможностью сортировки
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{/* Элемент медиа */}</div>
      ))}
    </div>
  );
}