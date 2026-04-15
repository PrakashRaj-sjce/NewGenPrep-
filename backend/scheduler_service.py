"""
NewGenPrep - Scheduler Service (V2.0 Fixed)
Background task for automated interview reminders (24h and 1h before).
Fixed: Proper asyncio cancellation handling to prevent Windows event loop crash.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional


class SchedulerService:
    def __init__(self):
        self.db = None
        self.notification_service = None
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self.check_interval_seconds = 1800  # 30 minutes

    def configure(self, db, notification_service):
        """Set dependencies after app startup."""
        self.db = db
        self.notification_service = notification_service

    async def start(self):
        """Start the background scheduler task."""
        if self._task is not None:
            print("WARNING: Scheduler already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        print(f"Scheduler started (checking every {self.check_interval_seconds}s)")

    async def stop(self):
        """Stop the scheduler gracefully - no event loop crash."""
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass  # Expected on shutdown
            self._task = None
        print("Scheduler stopped gracefully")

    async def _run_loop(self):
        """Main background loop. Catches CancelledError to prevent crash on Windows."""
        try:
            # Wait a bit after startup before first check
            await asyncio.sleep(10)

            while self._running:
                try:
                    await self.check_reminders()
                except asyncio.CancelledError:
                    raise  # Re-raise to exit loop
                except Exception as e:
                    print(f"WARNING: Scheduler check error (will retry): {e}")

                # Sleep in small chunks so cancellation is responsive
                for _ in range(self.check_interval_seconds // 5):
                    if not self._running:
                        return
                    await asyncio.sleep(5)

        except asyncio.CancelledError:
            print("Scheduler loop cancelled (shutdown)")
            return

    async def check_reminders(self):
        """Check for upcoming interviews and send reminder emails."""
        if self.db is None or self.notification_service is None:
            return

        now = datetime.utcnow()
        upcoming_24h = now + timedelta(hours=24)
        upcoming_1h = now + timedelta(hours=1)

        try:
            async for schedule in self.db.schedules.find({
                "status": {"$in": ["scheduled", "sent", "confirmed"]}
            }):
                try:
                    event_date = schedule.get("date", "")
                    event_time = schedule.get("time", "00:00")
                    if not event_date:
                        continue

                    interview_dt = datetime.strptime(f"{event_date} {event_time}", "%Y-%m-%d %H:%M")
                    time_until = interview_dt - now

                    # 24-hour reminder
                    if (timedelta(hours=23) <= time_until <= timedelta(hours=25)
                            and not schedule.get("reminderSent24hr", False)):
                        print(f"Sending 24h reminder to {schedule.get('candidateEmail')}")
                        result = await self.notification_service.send_interview_reminder(
                            schedule, hours_until=24
                        )
                        await self.db.schedules.update_one(
                            {"id": schedule["id"]},
                            {
                                "$set": {"reminderSent24hr": True},
                                "$push": {"notificationsSent": {
                                    "type": "reminder_24h",
                                    "sentAt": now.isoformat(),
                                    "status": result.get("status", "unknown"),
                                }},
                            },
                        )

                    # 1-hour reminder
                    elif (timedelta(minutes=45) <= time_until <= timedelta(hours=1, minutes=15)
                            and not schedule.get("reminderSent1hr", False)):
                        print(f"Sending 1h reminder to {schedule.get('candidateEmail')}")
                        result = await self.notification_service.send_interview_reminder(
                            schedule, hours_until=1
                        )
                        await self.db.schedules.update_one(
                            {"id": schedule["id"]},
                            {
                                "$set": {"reminderSent1hr": True},
                                "$push": {"notificationsSent": {
                                    "type": "reminder_1h",
                                    "sentAt": now.isoformat(),
                                    "status": result.get("status", "unknown"),
                                }},
                            },
                        )

                except ValueError as e:
                    print(f"WARNING: Date parse error for schedule {schedule.get('id')}: {e}")
                except Exception as e:
                    print(f"WARNING: Error processing schedule {schedule.get('id')}: {e}")

        except Exception as e:
            print(f"WARNING: Scheduler query error: {e}")


# Singleton instance
scheduler_service = SchedulerService()
