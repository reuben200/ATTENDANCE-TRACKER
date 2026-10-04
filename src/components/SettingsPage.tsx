import React, { useState } from 'react';
import { Activity } from '../types';
import { Plus, Trash2, Edit2, Check, X, Calendar, Settings, Info } from 'lucide-react';

interface SettingsPageProps {
  activities: Activity[];
  onAddActivity: (name: string, dayOfWeek: string) => void;
  onUpdateActivity: (id: string, name: string, dayOfWeek: string) => void;
  onDeleteActivity: (id: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  activities,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
}) => {
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDay, setNewActivityDay] = useState('Sunday');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDay, setEditDay] = useState('');

  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) {
      setError('Activity name cannot be empty.');
      return;
    }
    onAddActivity(newActivityName.trim(), newActivityDay);
    setNewActivityName('');
    setError(null);
  };

  const handleStartEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setEditName(activity.name);
    setEditDay(activity.dayOfWeek);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      alert('Activity name cannot be empty.');
      return;
    }
    onUpdateActivity(id, editName.trim(), editDay);
    setEditingId(null);
  };

  const dayOptions = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    '1st Saturday',
    '2nd Saturday',
    '3rd Saturday',
    '4th Saturday',
  ];

  return (
    <div id="settings-page" className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold tracking-tight text-[#3D3D33] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#5A5A40]" />
            Congregational Activities Settings
          </h2>
          <p className="text-sm text-[#7A7A66]">
            Define, add, and update weekly and monthly services for attendance tracking.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF2F2] text-[#B25E5E] border border-[#FAD2D2]">
          Admin Level ONLY
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add New Activity */}
        <div className="bg-[#F5F2ED] rounded-xl border border-[#E6E4DD] shadow-sm p-5 space-y-4 h-fit">
          <h3 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
            <Plus className="w-4 h-4 text-[#5A5A40]" />
            Add New Activity
          </h3>

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                Activity Name
              </label>
              <input
                id="activity-name-input"
                type="text"
                placeholder="e.g., Youth Fellowship"
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                className="w-full text-sm px-3.5 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-colors bg-white text-[#3D3D33]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#7A7A66] uppercase tracking-wider mb-1.5">
                Frequency / Day Held
              </label>
              <select
                id="activity-day-select"
                value={newActivityDay}
                onChange={(e) => setNewActivityDay(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-colors bg-white cursor-pointer text-[#3D3D33]"
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-xs text-[#B25E5E] font-medium">{error}</p>}

            <button
              id="add-activity-submit"
              type="submit"
              className="w-full py-2.5 px-4 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4E4E37] transition-all text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              CREATE ACTIVITY
            </button>
          </form>

          <div className="bg-white border border-[#E6E4DD] rounded-lg p-3.5 flex gap-2.5">
            <Info className="w-4 h-4 text-[#5A5A40] shrink-0 mt-0.5" />
            <p className="text-xs text-[#7A7A66] leading-relaxed">
              New activities will instantly appear in the attendance tracker dropdown for the Secretary and Administrators.
            </p>
          </div>
        </div>

        {/* Right Content: Existing Activities List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 space-y-4">
          <h3 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
            <Calendar className="w-4 h-4 text-[#5A5A40]" />
            Configured Activities ({activities.length})
          </h3>

          <div className="divide-y divide-[#E6E4DD] max-h-[480px] overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <div className="text-center py-12 text-[#7A7A66]">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50 text-[#5A5A40]" />
                <p className="text-sm font-medium">No activities registered yet.</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  id={`activity-item-${activity.id}`}
                  className="py-3.5 flex items-center justify-between gap-4 group transition-colors hover:bg-[#FAF9F6]/50 px-2 rounded-lg"
                >
                  {editingId === activity.id ? (
                    // Inline Edit Form
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        id={`edit-activity-name-${activity.id}`}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-sm px-3 py-1.5 border border-[#5A5A40] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#3D3D33] bg-white"
                        placeholder="Activity name"
                      />
                      <select
                        id={`edit-activity-day-${activity.id}`}
                        value={editDay}
                        onChange={(e) => setEditDay(e.target.value)}
                        className="text-sm px-2 py-1.5 border border-[#E6E4DD] rounded-md focus:outline-none bg-white cursor-pointer text-[#3D3D33]"
                      >
                        {dayOptions.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    // Info Row
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#FAF9F6] flex items-center justify-center border border-[#E6E4DD] text-[#5A5A40] shrink-0">
                        <span className="text-xs font-mono font-bold">
                          {activity.dayOfWeek.slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#3D3D33]">
                          {activity.name}
                        </h4>
                        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 bg-[#F5F2ED] text-[#5A5A40] rounded-full mt-0.5">
                          {activity.dayOfWeek}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingId === activity.id ? (
                      <>
                        <button
                          id={`save-activity-btn-${activity.id}`}
                          onClick={() => handleSaveEdit(activity.id)}
                          className="p-1.5 text-[#5A5A40] hover:bg-[#FAF9F6] rounded-md transition-colors cursor-pointer border border-[#E6E4DD]"
                          title="Save Changes"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          id={`cancel-activity-btn-${activity.id}`}
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-[#7A7A66] hover:bg-[#FAF9F6] rounded-md transition-colors cursor-pointer border border-[#E6E4DD]"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          id={`edit-activity-btn-${activity.id}`}
                          onClick={() => handleStartEdit(activity)}
                          className="p-1.5 text-[#7A7A66] hover:text-[#5A5A40] hover:bg-[#FAF9F6] border border-transparent hover:border-[#E6E4DD] rounded-md transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Edit Activity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-activity-btn-${activity.id}`}
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to remove "${activity.name}"? Historical attendance data for this activity type will still be kept.`
                              )
                            ) {
                              onDeleteActivity(activity.id);
                            }
                          }}
                          className="p-1.5 text-[#7A7A66] hover:text-[#B25E5E] hover:bg-[#FDF2F2] border border-transparent hover:border-[#FAD2D2] rounded-md transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Delete Activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
