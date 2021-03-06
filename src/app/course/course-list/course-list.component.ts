import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { QueryRef } from 'apollo-angular';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Course, Language, AllCoursesQuery } from '../../generated/graphql';
import { CourseService, AlertService, COURSE_LIMIT } from '../services';
import { NewCourseInput } from '../type';

@UntilDestroy({})
@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseListComponent implements OnInit {
  languages$!: Observable<Language[]>;
  errMsg$!: Observable<string>;
  successMsg$!: Observable<string>;
  courses$!: Observable<Course[]>;
  // offset = 0;
  coursesQuery!: QueryRef<AllCoursesQuery>;
  cursor = -1;
  loading = false;

  constructor(private service: CourseService,
              private alertService: AlertService) { }

  ngOnInit(): void {
    // this.courses$ = this.service.getAllCourses({
    //   offset: 0,
    //   limit: LIMIT
    // }).pipe(
    //   tap(results => this.offset = results.length)
    // );

    this.coursesQuery = this.service.getPaginatedCoursesQueryRef();

    this.courses$ = this.coursesQuery
      .valueChanges
      .pipe(
        map(({ data }) => data.courses),
        tap(courses => this.cursor = courses?.cursor || -1),
        map(courses => (courses?.courses || []) as Course[]),
        catchError(err => {
          console.error(err.message);
          this.cursor = -1;
          return of([] as Course[]);
        }),
      );

    this.languages$ = this.service.getLanguages();
    this.errMsg$ = this.alertService.errMsg$;
    this.successMsg$ = this.alertService.successMsg$;
  }

  trackByFunc(index: number, course: Course): string {
    return course.id;
  }

  submitNewCourse(newCourse: NewCourseInput): void {
    this.service.addCourse(newCourse)
      .subscribe();
  }

  loadMore(): void {
    this.loading = true;
    this.coursesQuery.fetchMore({
      variables: {
        args: {
          cursor: this.cursor,
          limit: COURSE_LIMIT
        }
      },
    })
    .finally(
      () => this.loading = false
    );
  }
}
