import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Course, Lesson } from '../../generated/graphql';
import { NewLessonInput } from './../type';
import { AlertService, CourseService, LessonService } from '../services';

@Component({
  selector: 'app-lessons',
  templateUrl: './lessons.component.html',
  styleUrls: ['./lessons.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonsComponent implements OnInit {
  course: Course | undefined | null = undefined;
  lessons: Lesson[] | undefined | null = undefined;
  errMsg$!: Observable<string>;
  successMsg$!: Observable<string>;

  constructor(private route: ActivatedRoute,
              private courseService: CourseService,
              private lessonService: LessonService,
              private alertService: AlertService,
              private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const courseId = params.get('id');
        return courseId ? this.courseService.getCourse(courseId) : undefined;
      }),
    ).subscribe({
      next: (course: any) => {
        this.course = course as Course;
        this.lessons = course?.lessons || [];
        this.cdr.markForCheck();
      },
      error: (err: Error) => alert(err.message),
    });
    this.errMsg$ = this.alertService.errMsg$;
    this.successMsg$ = this.alertService.successMsg$;
  }

  trackByFunc(index: number, lesson: Lesson): string {
    return lesson.id;
  }

  submitNewLesson(input: NewLessonInput): void {
    const { name } = input;
    if (this.course) {
      this.lessonService.addLesson(this.course, {
        name,
        courseId: this.course.id
      })
      .subscribe();
    }
  }
}
