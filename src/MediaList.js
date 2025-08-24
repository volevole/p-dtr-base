import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  arrayMove 
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

export function MediaList({ items, onReorder, onDelete, onView, onEditDescription }) {
  //console.log('MediaList received items:', items);
  //console.log('MediaList onEditDescription function:', onEditDescription ? 'exists' : 'undefined');

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={horizontalListSortingStrategy}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {items.map(item => (
            <SortableItem 
              key={item.id} 
              id={item.id} 
              item={{
                ...item,
                url: item.proxyUrl || item.url
              }} 
              onDelete={onDelete}
              onView={onView}
              onEditDescription={onEditDescription} // Передаем новый пропс
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}